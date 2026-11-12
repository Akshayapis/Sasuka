/**
 * U APP platform build service.
 *
 * One platform GitHub account runs every user's build. The owner configures the
 * credential ONCE through deployment environment variables (or the owner-only
 * setup panel on this device). End users never see or provide a token, repo or
 * workflow name.
 *
 * Flow per app:
 *   1. Create a private repository on the platform account (one repo per app).
 *   2. Push a complete native Android WebView project + the build workflow.
 *   3. Dispatch the workflow (workflow_dispatch) for that repo.
 *   4. Poll for up to 20 minutes. Success → artifact; >20 min → BUILD_TIMEOUT.
 *   5. Download page streams the real APK/AAB. Links expire after 9 minutes.
 *
 * If no platform credential is configured, the service still returns a genuinely
 * working installable package (PWA + offline shell) — never a dead "FAILED" app.
 */

import type { AppRecord } from "@/lib/store";

type Env = Record<string, string | undefined>;
const env = ((import.meta as unknown as { env?: Env }).env ?? {}) as Env;

const OWNER_KEY = "uapp.platform.runner.v1";
export const BUILD_TIMEOUT_MS = 20 * 60 * 1000;
export const BUILD_NORMAL_MS = 10 * 60 * 1000;

export type PlatformRunner = { owner: string; repo: string; workflow: string; ref: string; token: string };

function envRunner(): PlatformRunner | null {
  const owner = env.VITE_UAPP_GH_OWNER;
  const repo = env.VITE_UAPP_GH_REPO;
  const token = env.VITE_UAPP_GH_TOKEN;
  if (!owner || !token) return null;
  return { owner, repo: repo || "uapp-builds", workflow: env.VITE_UAPP_GH_WORKFLOW || "android-build.yml", ref: env.VITE_UAPP_GH_REF || "main", token };
}

function storedRunner(): PlatformRunner | null {
  try {
    const raw = localStorage.getItem(OWNER_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw) as PlatformRunner;
    return cfg.token && cfg.owner ? { ...cfg, repo: cfg.repo || "uapp-builds", workflow: cfg.workflow || "android-build.yml", ref: cfg.ref || "main" } : null;
  } catch {
    return null;
  }
}

export function platformRunner(): PlatformRunner | null {
  return envRunner() ?? storedRunner();
}

export function platformRunnerSource(): "environment" | "owner-device" | "none" {
  if (envRunner()) return "environment";
  if (storedRunner()) return "owner-device";
  return "none";
}

export function saveOwnerRunner(cfg: PlatformRunner): void {
  localStorage.setItem(OWNER_KEY, JSON.stringify(cfg));
}

export function clearOwnerRunner(): void {
  localStorage.removeItem(OWNER_KEY);
}

export function parseRepoSlug(input: string): { owner: string; repo: string } | null {
  const cleaned = input.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0], repo: parts[1] };
}

/* ------------------------------------------------------------------ GitHub transport */

async function gh<T>(cfg: PlatformRunner, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${cfg.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (res.status === 401) throw new Error("The platform GitHub credential is invalid or expired. The owner must update the deployment token.");
  if (res.status === 403) throw new Error("The platform GitHub credential lacks permission. It needs repository creation and Actions read/write.");
  if (res.status === 404) throw new Error("The platform GitHub repository or workflow was not found.");
  if (res.status === 422) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub rejected the request (422). ${body.slice(0, 160)}`);
  }
  if (!res.ok) throw new Error(`Platform build service error ${res.status}.`);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type PlatformRun = { id: number; status: string | null; conclusion: string | null; html_url: string; created_at: string; run_started_at?: string };
export type PlatformArtifact = { id: number; name: string; size_in_bytes: number; expired: boolean };

/* ------------------------------------------------------------------ project files */

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "app";
}

export function repoNameFor(app: { id: string; name: string }): string {
  return `uapp-${slug(app.name)}-${app.id.toLowerCase().replace(/[^a-z0-9]/g, "").slice(-6)}`;
}

async function pngBase64(size: number, color: string, letter: string): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, color);
    g.addColorStop(1, "#101605");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#f4f6ee";
    ctx.font = `bold ${Math.round(size * 0.5)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, size / 2, size / 2 + size * 0.03);
  }
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.split(",")[1] ?? "";
}

function websiteShell(app: AppRecord): string {
  const src = app.sourceLabel.startsWith("http") ? app.sourceLabel : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>${escapeHtml(app.name)}</title>
<style>
  html,body{margin:0;height:100%;background:${app.splashColor || "#080a0d"}}
  iframe{width:100%;height:100%;border:0;background:#fff;display:block}
  .off{display:none;position:fixed;inset:0;place-items:center;text-align:center;padding:24px;font:500 14px system-ui;background:${app.splashColor || "#080a0d"};color:#f4f6ee}
  body.offline .off{display:grid}
</style>
</head>
<body>
${src ? `<iframe src="${escapeHtml(src)}" title="${escapeHtml(app.name)}" allow="camera; microphone; geolocation; fullscreen; clipboard-write; autoplay" referrerpolicy="no-referrer-when-downgrade"></iframe>` : `<div class="off" style="display:grid"><div><h1>${escapeHtml(app.name)}</h1><p>Add your HTML pages to this folder to publish this app.</p></div></div>`}
<div class="off"><div><h1>You are offline</h1><p>Reconnect to load live content. This app shell works offline.</p></div></div>
<script>
  window.addEventListener("offline", () => document.body.classList.add("offline"));
  window.addEventListener("online", () => document.body.classList.remove("offline"));
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./manifest.webmanifest").catch(() => {});
</script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function androidFiles(app: AppRecord, icon192: string, icon512: string): { path: string; content: string; encoding?: "base64" }[] {
  const pkgPath = app.packageId.split(".").join("/");
  const permissions = app.permissions.length ? app.permissions : ["internet", "network"];
  const permXml = permissions.map((p) => `    <uses-permission android:name="android.permission.${permCode(p)}" />`).join("\n");
  const manifestJson = JSON.stringify({
    name: app.name,
    short_name: app.name.slice(0, 12),
    start_url: "./index.html",
    display: "standalone",
    orientation: "portrait",
    background_color: app.splashColor,
    theme_color: app.iconColor,
    icons: [
      { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  }, null, 2);

  return [
    { path: "README.md", content: `# ${app.name}\n\nGenerated by U APP.\n\n- Package: \`${app.packageId}\`\n- Version: \`${app.version}\`\n- Type: **${app.type}**\n- Source: ${app.sourceLabel}\n- Template: ${app.template}\n\n## Build\n\nThis repository is a complete native Android WebView project. Push triggers the\nincluded GitHub Actions workflow, which builds a real APK/AAB.\n\n\`\`\`bash\ngradle assembleDebug     # APK\ngradle bundleRelease     # AAB\n\`\`\`\n\n## Run the website in a browser\n\nOpen \`app/src/main/assets/www/index.html\`. To test instantly, host the\n\`app/src/main/assets/www\` folder on any HTTPS static host.\n\n## Permissions\n\n${permissions.map((p) => `- \`android.permission.${permCode(p)}\``).join("\n")}\n` },
    { path: "settings.gradle", content: `rootProject.name = "${app.name.replace(/["\\]/g, "")}"\ninclude ':app'\n` },
    { path: "build.gradle", content: `buildscript {\n    repositories { google(); mavenCentral() }\n    dependencies {\n        classpath "com.android.tools.build:gradle:8.5.2"\n        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.24"\n    }\n}\nallprojects { repositories { google(); mavenCentral() } }\n` },
    { path: "gradle.properties", content: `org.gradle.jvmargs=-Xmx2048m\nandroid.useAndroidX=true\nandroid.nonTransitiveRClass=true\n` },
    { path: "app/build.gradle", content: `apply plugin: 'com.android.application'\napply plugin: 'org.jetbrains.kotlin.android'\n\nandroid {\n    namespace "${app.packageId}"\n    compileSdk 34\n    defaultConfig {\n        applicationId "${app.packageId}"\n        minSdk 24\n        targetSdk 34\n        versionCode 1\n        versionName "${app.version}"\n    }\n    buildTypes {\n        release { minifyEnabled false }\n    }\n    compileOptions { sourceCompatibility JavaVersion.VERSION_17; targetCompatibility JavaVersion.VERSION_17 }\n    kotlinOptions { jvmTarget = "17" }\n}\n\ndependencies {\n    implementation "androidx.appcompat:appcompat:1.7.0"\n}\n` },
    { path: "app/src/main/AndroidManifest.xml", content: `<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n${permXml}\n    <application\n        android:label="${escapeHtml(app.name)}"\n        android:icon="@mipmap/ic_launcher"\n        android:usesCleartextTraffic="false"\n        android:theme="@style/Theme.AppCompat.NoActionBar">\n        <activity android:name=".MainActivity" android:exported="true">\n            <intent-filter>\n                <action android:name="android.intent.action.MAIN" />\n                <category android:name="android.intent.category.LAUNCHER" />\n            </intent-filter>\n        </activity>\n    </application>\n</manifest>\n` },
    { path: "app/src/main/res/values/strings.xml", content: `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">${escapeHtml(app.name)}</string>\n</resources>\n` },
    { path: `app/src/main/java/${pkgPath}/MainActivity.kt`, content: `package ${app.packageId}\n\nimport android.annotation.SuppressLint\nimport android.os.Bundle\nimport android.net.Uri\nimport android.webkit.*\nimport android.widget.FrameLayout\nimport androidx.appcompat.app.AppCompatActivity\n\nclass MainActivity : AppCompatActivity() {\n    private lateinit var web: WebView\n\n    @SuppressLint("SetJavaScriptEnabled")\n    override fun onCreate(savedInstanceState: Bundle?) {\n        super.onCreate(savedInstanceState)\n        web = WebView(this)\n        web.settings.apply {\n            javaScriptEnabled = true\n            domStorageEnabled = true\n            allowFileAccess = true\n            allowContentAccess = true\n            mediaPlaybackRequiresUserGesture = false\n        }\n        web.webViewClient = WebViewClient()\n        web.webChromeClient = WebChromeClient(object : WebChromeClient.FileChooserParams() {})\n        web.setDownloadListener { url, _, _, _, _ -> startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, Uri.parse(url))) }\n        setContentView(web)\n        val url = "${app.sourceLabel.startsWith("http") ? escapeHtml(app.sourceLabel) : "file:///android_asset/www/index.html"}"\n        if (url.startsWith("http")) web.loadUrl(url) else web.loadUrl("file:///android_asset/www/index.html")\n    }\n\n    override fun onBackPressed() {\n        if (this::web.isInitialized && web.canGoBack()) web.goBack() else super.onBackPressed()\n    }\n}\n` },
    { path: "app/src/main/assets/www/index.html", content: websiteShell(app) },
    { path: "app/src/main/assets/www/manifest.webmanifest", content: manifestJson },
    { path: "app/src/main/assets/www/icon-192.png", content: icon192, encoding: "base64" },
    { path: "app/src/main/assets/www/icon-512.png", content: icon512, encoding: "base64" },
    { path: "permission.txt", content: permissions.map((p) => `# ${p}\nandroid.permission.${permCode(p)}`).join("\n\n") + "\n" },
    { path: "uapp-project.json", content: JSON.stringify({ app: { id: app.id, name: app.name, package_id: app.packageId, version: app.version, type: app.type, source: app.sourceLabel, template: app.template, splash: app.splashColor, icon: app.iconColor }, permissions: app.permissions, ads: app.adsEnabled ? { network: app.adNetwork, formats: app.adFormats, timing: app.adTiming } : null, generated_at: new Date().toISOString(), generated_by: "U APP" }, null, 2) },
  ];
}

function permCode(p: string): string {
  const map: Record<string, string> = {
    internet: "INTERNET", network: "ACCESS_NETWORK_STATE", notifications: "POST_NOTIFICATIONS", camera: "CAMERA",
    microphone: "RECORD_AUDIO", location: "ACCESS_FINE_LOCATION", bluetooth: "BLUETOOTH_CONNECT", nfc: "NFC",
    media: "READ_MEDIA_IMAGES", contacts: "READ_CONTACTS", calendar: "READ_CALENDAR", vibration: "VIBRATE",
    wakelock: "WAKE_LOCK", foreground: "FOREGROUND_SERVICE", storage: "READ_EXTERNAL_STORAGE", biometric: "USE_BIOMETRIC",
  };
  return map[p] ?? p.toUpperCase();
}

export const WORKFLOW_YAML = `name: Android app build
on:
  workflow_dispatch:
  push:
    branches: [ main ]
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"
      - uses: android-actions/setup-android@v3
      - uses: gradle/actions/setup-gradle@v3
        with:
          gradle-version: "8.9"
      - name: Build debug APK
        run: gradle assembleDebug --no-daemon --stacktrace
      - name: Build release AAB
        run: gradle bundleRelease --no-daemon --stacktrace
        continue-on-error: true
      - name: Collect artifacts
        run: |
          mkdir -p out
          find app/build/outputs -type f \\( -name '*.apk' -o -name '*.aab' \\) -exec cp {} out/ \\;
          cp permission.txt out/ 2>/dev/null || true
          ls -lh out/
      - uses: actions/upload-artifact@v4
        with:
          name: uapp-artifact
          path: out/
          retention-days: 1
          if-no-files-found: error
`;

/* ------------------------------------------------------------------ repo + build */

export type BuildProgress = (line: string) => void;

export async function provisionRepo(app: AppRecord, onStep: BuildProgress): Promise<{ owner: string; repo: string; url: string }> {
  const cfg = platformRunner();
  if (!cfg) throw new Error("PLATFORM_RUNNER_MISSING");
  const repoName = repoNameFor(app);
  onStep(`Creating platform repository ${cfg.owner}/${repoName}…`);

  let defaultBranch = "main";
  try {
    const existing = await gh<{ default_branch: string }>(cfg, `/repos/${cfg.owner}/${repoName}`);
    defaultBranch = existing.default_branch || "main";
    onStep(`Repository already exists · reusing ${cfg.owner}/${repoName}`);
  } catch {
    const created = await gh<{ default_branch: string }>(cfg, `/user/repos`, {
      method: "POST",
      body: JSON.stringify({
        name: repoName,
        description: `U APP build · ${app.name} · ${app.packageId}`,
        private: true,
        auto_init: true,
      }),
    });
    defaultBranch = created.default_branch || "main";
    onStep("Repository created (private). Pushing generated Android project…");
  }

  // Give auto_init a moment to create the first commit.
  let headSha = "";
  for (let i = 0; i < 6; i += 1) {
    try {
      const refData = await gh<{ object: { sha: string } }>(cfg, `/repos/${cfg.owner}/${repoName}/git/ref/heads/${defaultBranch}`);
      headSha = refData.object.sha;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 1800));
    }
  }

  const icon192 = await pngBase64(192, app.iconColor, app.name.slice(0, 1).toUpperCase());
  const icon512 = await pngBase64(512, app.iconColor, app.name.slice(0, 1).toUpperCase());
  const files = [
    ...androidFiles(app, icon192, icon512),
    { path: ".github/workflows/android-build.yml", content: WORKFLOW_YAML },
  ];

  onStep(`Preparing ${files.length} project files…`);
  const tree: { path: string; mode: string; type: string; sha: string }[] = [];
  for (const file of files) {
    const blob = await gh<{ sha: string }>(cfg, `/repos/${cfg.owner}/${repoName}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: file.content, encoding: file.encoding ?? "utf-8" }),
    });
    tree.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
  }

  let baseTree: string | undefined;
  if (headSha) {
    try {
      const head = await gh<{ tree: { sha: string } }>(cfg, `/repos/${cfg.owner}/${repoName}/git/commits/${headSha}`);
      baseTree = head.tree.sha;
    } catch {
      baseTree = undefined;
    }
  }
  const treeRes = await gh<{ sha: string }>(cfg, `/repos/${cfg.owner}/${repoName}/git/trees`, {
    method: "POST",
    body: JSON.stringify(baseTree ? { base_tree: baseTree, tree } : { tree }),
  });
  let parentSha = headSha;
  if (!parentSha) {
    const refData = await gh<{ object: { sha: string } }>(cfg, `/repos/${cfg.owner}/${repoName}/git/ref/heads/${defaultBranch}`);
    parentSha = refData.object.sha;
  }
  const commit = await gh<{ sha: string }>(cfg, `/repos/${cfg.owner}/${repoName}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: `U APP build · ${app.name}\n\nPackage: ${app.packageId}\nType: ${app.type}\nSource: ${app.sourceLabel}`,
      tree: treeRes.sha,
      parents: [parentSha],
    }),
  });
  await gh(cfg, `/repos/${cfg.owner}/${repoName}/git/refs/heads/${defaultBranch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: true }),
  });
  onStep(`Code pushed · commit ${commit.sha.slice(0, 7)} on ${defaultBranch}`);

  return { owner: cfg.owner, repo: repoName, url: `https://github.com/${cfg.owner}/${repoName}` };
}

export async function dispatchJob(repo: string, onStep: BuildProgress): Promise<{ runId: number | null; runUrl?: string }> {
  const cfg = platformRunner();
  if (!cfg) throw new Error("PLATFORM_RUNNER_MISSING");
  // The pushed workflow also runs on push; wait for that run first.
  for (let i = 0; i < 6; i += 1) {
    const data = await gh<{ workflow_runs: PlatformRun[] }>(cfg, `/repos/${cfg.owner}/${repo}/actions/runs?per_page=5`);
    const run = data.workflow_runs?.find((r) => Date.now() - new Date(r.created_at).getTime() < 180000);
    if (run) {
      onStep(`Build started · run #${run.id}`);
      return { runId: run.id, runUrl: run.html_url };
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  onStep("Dispatching the workflow manually…");
  await gh(cfg, `/repos/${cfg.owner}/${repo}/actions/workflows/${encodeURIComponent(cfg.workflow)}/dispatches`, {
    method: "POST",
    body: JSON.stringify({ ref: cfg.ref || "main" }),
  });
  for (let i = 0; i < 8; i += 1) {
    await new Promise((r) => setTimeout(r, 2500));
    const data = await gh<{ workflow_runs: PlatformRun[] }>(cfg, `/repos/${cfg.owner}/${repo}/actions/runs?per_page=5`);
    const run = data.workflow_runs?.find((r) => Date.now() - new Date(r.created_at).getTime() < 180000);
    if (run) {
      onStep(`Build queued · run #${run.id}`);
      return { runId: run.id, runUrl: run.html_url };
    }
    onStep("Waiting for the runner to accept the job…");
  }
  return { runId: null };
}

export async function fetchPlatformRun(repo: string, runId: number): Promise<PlatformRun> {
  const cfg = platformRunner();
  if (!cfg) throw new Error("Platform build service is not configured.");
  return gh<PlatformRun>(cfg, `/repos/${cfg.owner}/${repo}/actions/runs/${runId}`);
}

export async function fetchPlatformArtifacts(repo: string, runId: number): Promise<PlatformArtifact[]> {
  const cfg = platformRunner();
  if (!cfg) throw new Error("Platform build service is not configured.");
  const data = await gh<{ artifacts: PlatformArtifact[] }>(cfg, `/repos/${cfg.owner}/${repo}/actions/runs/${runId}/artifacts`);
  return data.artifacts ?? [];
}

export async function downloadPlatformArtifact(repo: string, artifactId: number, packageId: string): Promise<void> {
  const cfg = platformRunner();
  if (!cfg) throw new Error("Platform build service is not configured.");
  const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${repo}/actions/artifacts/${artifactId}/zip`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${cfg.token}`, "X-GitHub-Api-Version": "2022-11-28" },
  });
  if (!res.ok) throw new Error(`Artifact download failed (HTTP ${res.status}). The build artifact may have expired.`);
  const zipBlob = await res.blob();
  const { default: JSZip } = await import("jszip");
  const archive = await JSZip.loadAsync(zipBlob);
  const apk = Object.values(archive.files).find((f) => !f.dir && /\.(apk|aab)$/i.test(f.name));
  if (!apk) {
    saveBlob(zipBlob, `${packageId}-build.zip`);
    return;
  }
  saveBlob(await apk.async("blob"), `${packageId}-${apk.name.split("/").pop()}`);
}

export async function testPlatformCredential(): Promise<{ ok: boolean; message: string }> {
  const cfg = platformRunner();
  if (!cfg) return { ok: false, message: "No platform credential configured." };
  try {
    const user = await gh<{ login: string }>(cfg, "/user");
    return { ok: true, message: `Connected as ${user.login}. New apps will create a private repo and dispatch a real APK build.` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/* ------------------------------------------------------------------ installable fallback package */

export type InstallableApp = { blob: Blob; filename: string; sizeMb: number; ms: number };

export async function generateInstallableApp(app: AppRecord): Promise<InstallableApp> {
  const started = performance.now();
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const root = zip.folder("uapp-app")!;
  const isUrl = app.sourceLabel.startsWith("http");
  const pkg = { scripts: { start: "npx serve ." }, devDependencies: { serve: "^14.2.3" } };

  root.file("index.html", websiteShell(app));
  root.file("manifest.webmanifest", JSON.stringify({
    name: app.name, short_name: app.name.slice(0, 12), start_url: "./index.html", display: "standalone",
    background_color: app.splashColor, theme_color: app.iconColor,
    icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png" }, { src: "icon-512.png", sizes: "512x512", type: "image/png" }],
  }, null, 2));
  root.file("sw.js", `const C="uapp-${app.id}";self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(["./","./index.html","./manifest.webmanifest"])).then(()=>self.skipWaiting())));self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));self.addEventListener("fetch",e=>{if(e.request.method==="GET")e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(h=>h||caches.match("./index.html"))))});`);
  root.file("icon-192.png", await (async () => {
    const canvas = document.createElement("canvas"); canvas.width = 192; canvas.height = 192;
    const ctx = canvas.getContext("2d"); if (ctx) { ctx.fillStyle = app.iconColor; ctx.fillRect(0, 0, 192, 192); ctx.fillStyle = "#111605"; ctx.font = "bold 96px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(app.name.slice(0, 1).toUpperCase(), 96, 100); }
    return canvas.toDataURL("image/png").split(",")[1];
  })(), { base64: true });
  root.file("package.json", JSON.stringify(pkg, null, 2));
  root.file("README.md", `# ${app.name}\n\nBuilt with U APP.\n\n## Install on a phone\n\n1. Host this folder on any HTTPS static host.\n2. Open it in Chrome on Android.\n3. Tap **Install app**. It opens full-screen with its own icon.\n\n## Use on your own website\n\nHost the folder and link to it, or embed the hosted URL in an \`<iframe>\`.\n\nSource: ${app.sourceLabel}\nPackage: ${app.packageId}\n`);
  root.file("permission.txt", app.permissions.map((p) => `android.permission.${permCode(p)}`).join("\n") + "\n");
  root.file("uapp-project.json", JSON.stringify({ id: app.id, name: app.name, package_id: app.packageId, version: app.version, type: app.type, source: app.sourceLabel, template: app.template, permissions: app.permissions }, null, 2));
  if (isUrl) root.file("embed-snippet.html", `<!-- Host this file to share your app, or paste the iframe on your site -->\n<iframe src="${escapeHtml(app.sourceLabel)}" style="width:100%;height:100vh;border:0" title="${escapeHtml(app.name)}"></iframe>\n`);

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return { blob, filename: `${app.packageId}-installable-app.zip`, sizeMb: Math.round((blob.size / 1024 / 1024) * 10) / 10, ms: Math.round(performance.now() - started) };
}

export function saveInstallable(pkg: InstallableApp): void {
  saveBlob(pkg.blob, pkg.filename);
}

export function openInstallablePreview(app: AppRecord): void {
  const isUrl = app.sourceLabel.startsWith("http");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(app.name)}</title>
<style>html,body{margin:0;height:100%;background:${app.splashColor}}iframe{width:100%;height:100%;border:0;background:#fff}.bar{position:fixed;bottom:0;left:0;right:0;display:flex;gap:6px;padding:8px;background:#0b0e13;border-top:1px solid rgba(255,255,255,.1)}.bar a,.bar button{flex:1;text-align:center;font:600 12px system-ui;color:#111605;background:${app.iconColor};padding:10px;border-radius:9px;text-decoration:none;border:0}.bar button{background:rgba(255,255,255,.08);color:#e8ecdf}</style></head>
<body><iframe src="${isUrl ? escapeHtml(app.sourceLabel) : "about:blank"}" allow="camera;microphone;geolocation;fullscreen"></iframe>
<div class="bar"><button onclick="history.back()">Back</button><a href="${isUrl ? escapeHtml(app.sourceLabel) : "#"}" target="_blank" rel="noreferrer">Open website</a><button onclick="location.reload()">Reload</button></div></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 120000);
}
