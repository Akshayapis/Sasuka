import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Braces,
  Check,
  CheckCircle2,
  Code2,
  Download,
  FileArchive,
  FileCheck2,
  FileWarning,
  Gamepad2,
  Globe2,
  Layers,
  Lock,
  PanelTop,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  TriangleAlert,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { Badge, Button, buttonClass, Card, Field, Input, Progress, Select, Textarea, useToast } from "@/components/ui";
import { PageHeader } from "@/components/Shell";
import { TemplateMini } from "@/components/TemplateMini";
import {
  AD_FORMATS,
  AD_TIMINGS,
  APP_TYPES,
  NETWORKS,
  PERMISSIONS,
  TEMPLATES,
  type AppType,
} from "@/data/catalog";
import { useStore } from "@/lib/store";
import { cn } from "@/utils/cn";

const ICONS: Record<string, typeof Globe2> = {
  globe: Globe2, code: Code2, braces: Braces, server: Server, layers: Layers, smartphone: Smartphone,
  search: Search, sparkles: Sparkles, gamepad: Gamepad2, panel: PanelTop, terminal: Terminal, box: Boxes,
};

type ZipReport = {
  name: string;
  size: number;
  total: number;
  supported: { file: string; type: string }[];
  partial: { file: string; reason: string }[];
  unsupported: { file: string; reason: string }[];
  folders: number;
};

const SUPPORTED_EXT: Record<string, string> = {
  html: "HTML", htm: "HTML", css: "CSS", js: "JavaScript", jsx: "React JSX", ts: "TypeScript", tsx: "React TSX",
  json: "JSON", xml: "Android XML", png: "Image", jpg: "Image", jpeg: "Image", gif: "Image", svg: "SVG", webp: "Image",
  woff: "Font", woff2: "Font", ttf: "Font", otf: "Font", txt: "Text", md: "Markdown", gradle: "Gradle", properties: "Config",
  webp2: "Image", ico: "Icon", map: "Source map", webmanifest: "PWA manifest", mjs: "JavaScript", cjs: "JavaScript",
};
const PARTIAL_EXT: Record<string, string> = {
  java: "Java source requires an Android/Gradle build configuration and compatible SDK targets.",
  kt: "Kotlin source requires an Android/Gradle build configuration and compatible SDK targets.",
  php: "PHP is a server-side runtime. It cannot be converted into native Android code and needs PHP hosting.",
  py: "Python is not compiled by the Android build pipeline; it can only ship through a compatible runtime.",
  dart: "Dart/Flutter needs the Flutter toolchain and a complete project configuration.",
  cs: "C# requires a .NET/Unity toolchain; plain C# cannot be compiled into this Android build.",
  c: "C source needs an NDK toolchain and explicit native build configuration.",
  cpp: "C++ source needs an NDK toolchain and explicit native build configuration.",
  cc: "C++ source needs an NDK toolchain and explicit native build configuration.",
  h: "Native header requires an NDK toolchain and explicit build configuration.",
  vue: "Vue single-file components need a frontend build step before import.",
  svelte: "Svelte components need a frontend build step before import.",
  sql: "SQL schema needs a database server; it is not included in an Android app bundle.",
  env: "Environment secrets are never packaged into an app artifact.",
  sh: "Shell scripts are not executed by the Android build pipeline.",
  jar: "Binary dependencies may be incompatible and require explicit Gradle configuration.",
  aar: "Android libraries require matching Gradle repositories and configuration.",
  apk: "Nested APKs are not unpacked or rebuilt automatically.",
};
const UNSUPPORTED_EXT: Record<string, string> = {
  exe: "Windows executable — cannot be shipped inside an Android application.",
  dll: "Windows binary — incompatible with Android.",
  dmg: "macOS installer image — not an app source format.",
  psd: "Layered design source — export PNG/WebP assets instead.",
  ai: "Design source — export PNG/WebP/SVG assets instead.",
  zip: "Nested archive — extract it before upload so every file can be inspected.",
  rar: "Archive format — extract it before upload.",
  "7z": "Archive format — extract it before upload.",
  so: "Native binary — require matching ABI and NDK build configuration.",
  ipa: "iOS application package — incompatible with the Android pipeline.",
  xapk: "Android split package — cannot be converted into a source build.",
};

const permissionLines: Record<string, string> = {
  internet: "android.permission.INTERNET",
  network: "android.permission.ACCESS_NETWORK_STATE",
  notifications: "android.permission.POST_NOTIFICATIONS",
  camera: "android.permission.CAMERA",
  microphone: "android.permission.RECORD_AUDIO",
  location: "android.permission.ACCESS_FINE_LOCATION",
  bluetooth: "android.permission.BLUETOOTH_CONNECT",
  nfc: "android.permission.NFC",
  media: "android.permission.READ_MEDIA_IMAGES",
  contacts: "android.permission.READ_CONTACTS",
  calendar: "android.permission.READ_CALENDAR",
  vibration: "android.permission.VIBRATE",
  wakelock: "android.permission.WAKE_LOCK",
  foreground: "android.permission.FOREGROUND_SERVICE",
  storage: "android.permission.READ_EXTERNAL_STORAGE",
  biometric: "android.permission.USE_BIOMETRIC",
};

function needsUrl(type: AppType) {
  return ["website", "webview", "pwa", "game", "php"].includes(type.id);
}

export default function BuilderPage() {
  const { quota, createApp, startBuild } = useStore();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<AppType | null>(null);
  const [sourceMode, setSourceMode] = useState<"url" | "zip" | "code">("url");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [zip, setZip] = useState<ZipReport | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [zipError, setZipError] = useState("");
  const [zipAccepted, setZipAccepted] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [packageId, setPackageId] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [buildType, setBuildType] = useState("Debug APK");
  const [iconColor, setIconColor] = useState("#c9f65b");
  const [iconName, setIconName] = useState("");
  const [splashColor, setSplashColor] = useState("#0a0c10");
  const [nav, setNav] = useState("Bottom navigation");
  const [back, setBack] = useState("History aware");
  const [offline, setOffline] = useState("Built-in U APP offline page");
  const [network, setNetwork] = useState("Wi-Fi + mobile data");
  const [permissions, setPermissions] = useState<string[]>(["internet", "network"]);
  const [adsChoice, setAdsChoice] = useState<"skip" | "configure">("skip");
  const [networkId, setNetworkId] = useState("admob");
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [formats, setFormats] = useState<string[]>(["Banner"]);
  const [timing, setTiming] = useState("30 seconds");
  const [manualAds, setManualAds] = useState(true);
  const [customTiming, setCustomTiming] = useState("");
  const [adConsent, setAdConsent] = useState(false);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [templateCat, setTemplateCat] = useState("All");
  const [templateQ, setTemplateQ] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdId, setCreatedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);

  const plan = quota.plan;
  const adsEligible = plan.ads && quota.state === "active";
  const buildOptions = plan.builds;
  const categories = useMemo(() => ["All", ...Array.from(new Set(TEMPLATES.map((t) => t.category)))], []);
  const templates = useMemo(
    () => TEMPLATES.filter((t) => (templateCat === "All" || t.category === templateCat) && t.name.toLowerCase().includes(templateQ.toLowerCase())),
    [templateCat, templateQ]
  );
  const selectedTemplate = TEMPLATES.find((t) => t.id === templateId) ?? null;
  const selectedNetwork = NETWORKS.find((n) => n.id === networkId) ?? NETWORKS[0];

  const steps = ["App type", "Source", "App details", "Permissions", "Ads", "UI template", "Review"];
  const canProceed = [
    !!type,
    sourceMode === "url" ? url.trim().length > 0 : sourceMode === "zip" ? (zip ? zipAccepted : false) : code.trim().length > 20,
    name.trim().length >= 2 && /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(packageId),
    permissions.length > 0,
    true,
    !!templateId,
    agree,
  ][step];

  const handleZip = async (file?: File) => {
    if (!file) return;
    setZipError("");
    setZip(null);
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".zip") && !lower.endsWith(".apk")) {
      setZipError("Upload a .zip project or an .apk for analysis. Individual HTML can be pasted on the HTML source tab.");
      return;
    }
    if (lower.endsWith(".apk")) {
      setZip({ name: file.name, size: file.size, total: 1, supported: [], partial: [{ file: file.name, reason: "APK binary metadata captured. Manifest, permissions and package inspection require the server-side APK analyser — no code claims are made here." }], unsupported: [], folders: 0 });
      setZipAccepted(false);
      setZipBusy(false);
      return;
    }
    if (file.size > plan.maxProjectMb * 1024 * 1024) {
      setZipError(`This archive is ${(file.size / 1024 / 1024).toFixed(1)} MB. Your ${plan.name} plan allows up to ${plan.maxProjectMb} MB.`);
      return;
    }
    setZipBusy(true);
    try {
      const { default: JSZip } = await import("jszip");
      const archive = await JSZip.loadAsync(file);
      if (Object.keys(archive.files).length > 5000) throw new Error("Archive contains more than 5,000 entries. Please reduce the project size.");
      const report: ZipReport = { name: file.name, size: file.size, total: 0, supported: [], partial: [], unsupported: [], folders: 0 };
      archive.forEach((rel, entry) => {
        if (entry.dir) {
          report.folders += 1;
          return;
        }
        const clean = rel.replace(/^(\.\.\/|\/)+/, "");
        if (clean !== rel) report.unsupported.push({ file: rel, reason: "Unsafe path detected (ZIP slip protection). File will not be extracted." });
        const ext = clean.split(".").pop()?.toLowerCase() ?? "";
        report.total += 1;
        if (SUPPORTED_EXT[ext]) report.supported.push({ file: clean, type: SUPPORTED_EXT[ext] });
        else if (PARTIAL_EXT[ext]) report.partial.push({ file: clean, reason: PARTIAL_EXT[ext] });
        else if (UNSUPPORTED_EXT[ext]) report.unsupported.push({ file: clean, reason: UNSUPPORTED_EXT[ext] });
        else report.unsupported.push({ file: clean, reason: ext ? `Unrecognised .${ext} format for this build pipeline.` : "File has no extension; classification could not be confirmed." });
      });
      setZip(report);
      setZipAccepted(false);
      toast(`Scanned ${report.total} files in ${report.folders} folder${report.folders === 1 ? "" : "s"}.`, "success");
    } catch (e) {
      setZipError(e instanceof Error ? e.message : "Could not read this archive. Confirm it is a valid ZIP.");
    } finally {
      setZipBusy(false);
    }
  };

  const next = () => {
    setErrors({});
    if (step === 1 && sourceMode === "url" && type && needsUrl(type)) {
      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("protocol");
        if (parsed.protocol !== "https:") {
          setUrlError("Use an HTTPS URL. Plain HTTP destinations are rejected for production apps.");
          return;
        }
      } catch {
        setUrlError("Enter a complete HTTPS URL, for example https://example.com.");
        return;
      }
    }
    if (step === 2) {
      const e: Record<string, string> = {};
      if (name.trim().length < 2) e.name = "Enter an app name (2+ characters).";
      if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(packageId)) e.packageId = "Use a valid Android package ID, e.g. app.brand.name.";
      setErrors(e);
      if (Object.keys(e).length) return;
    }
    if (!canProceed && step !== 2) {
      const messages = [
        "Choose an app type to continue.",
        sourceMode === "zip" && zip ? "Continue with supported files or upload another archive." : "Provide a valid source to continue.",
        "",
        "Select at least the network permission.",
        "",
        "Choose one of the 54 UI templates.",
        "Confirm the review checklist.",
      ];
      if (messages[step]) toast(messages[step], "error");
      return;
    }
    setStep((s) => Math.min(6, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goStep = (i: number) => {
    if (i < step) { setStep(i); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const flipFormat = (f: string) => setFormats((v) => (v.includes(f) ? v.filter((x) => x !== f) : [...v, f]));

  const selectType = (t: AppType) => {
    setType(t);
    setSourceMode(needsUrl(t) ? "url" : "zip");
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const build = async () => {
    if (!type || !selectedTemplate) return;
    if (quota.remaining <= 0) {
      toast(quota.state === "active" ? "No app credits remaining on this plan." : "Your monthly free app limit has been reached. Upgrade your plan to continue creating apps.", "error");
      return;
    }
    const src =
      sourceMode === "url" ? url : sourceMode === "zip" && zip ? zip.name : "Pasted HTML source";
    const notes = [
      `Source validated: ${src}`,
      `Template: ${selectedTemplate.name}`,
      `Permissions generated: ${permissions.length}`,
      adsChoice === "configure" && adsEligible ? `Ads configured: ${selectedNetwork.name}` : "Ad configuration skipped",
    ];
    if (sourceMode === "zip" && zip) notes.push(`ZIP scan: ${zip.supported.length} supported · ${zip.partial.length} partial · ${zip.unsupported.length} unsupported`);
    if (sourceMode === "url") notes.push("WebView embedding limitations reviewed; frame-blocking sites may not render fully.");
    const res = createApp({
      name: name.trim(),
      packageId,
      type: type.id,
      sourceLabel: src,
      template: selectedTemplate.name,
      templateId: selectedTemplate.id,
      permissions,
      adsEnabled: adsChoice === "configure" && adsEligible,
      adNetwork: adsEligible ? selectedNetwork.name : undefined,
      adFormats: adsEligible ? formats : [],
      adTiming: adsEligible ? (timing === "Custom" ? customTiming || "Custom" : timing) : undefined,
      version,
      buildType,
      artifactMb: sourceMode === "zip" && zip ? Math.max(2.2, Math.round((zip.size / 1024 / 1024) * 1.8 * 10) / 10) : 4.8,
      iconColor,
      offline,
      splashColor,
      notes,
      icon: iconName || undefined,
    });
    if (!res.ok) {
      toast(res.message ?? "Could not create the app.", "error");
      return;
    }
    setCreatedId(res.appId ?? null);
    toast("App created. One credit committed — building your app now.", "success");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (res.appId) void startBuild(res.appId);
  };

  if (createdId) {
    return <BuildComplete appId={createdId} name={name} packageId={packageId} template={selectedTemplate?.name ?? ""} remaining={quota.remaining} />;
  }

  return (
    <div>
      <PageHeader
        title="Create App"
        subtitle="Configure once. Validate before a credit is reserved. Build through the isolated pipeline."
        eyebrow="App builder"
        actions={<><Link to="/app/apps" className={buttonClass("ghost", "md")}>Cancel</Link><Link to="/app/plans" className={buttonClass("secondary", "md")}><Zap className="h-4 w-4 text-lime" /> {quota.remaining} credits left</Link></>}
      />

      {quota.remaining === 0 && (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3.5 py-3 sm:flex-row sm:items-center">
          <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="flex-1 text-[10.5px] leading-relaxed text-muted"><span className="font-semibold text-ink">Your monthly free app limit has been reached.</span> You can configure a project, but creation is blocked until your allowance resets on {quota.resetLabel} or you activate a paid plan.</p>
          <Link to="/app/plans" className={buttonClass("lime", "sm")}>Upgrade plan</Link>
        </div>
      )}

      <div className="mb-5 no-scrollbar overflow-x-auto">
        <div className="flex min-w-max items-center gap-1">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <button
                onClick={() => goStep(i)}
                disabled={i > step}
                className={cn("flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[10.5px] font-semibold transition", i === step ? "bg-ink text-bg" : i < step ? "text-ink hover:bg-panel2" : "text-muted")}
              >
                <span className={cn("grid h-4 w-4 place-items-center rounded-full font-mono text-[8px]", i === step ? "bg-lime text-limeink" : i < step ? "bg-lime/20 text-lime" : "border border-line")}>
                  {i < step ? <Check className="h-2.5 w-2.5" /> : String(i + 1).padStart(2, "0")}
                </span>
                {s}
              </button>
              {i < steps.length - 1 && <span className="h-px w-3 bg-line" />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <Card className="min-h-[520px] p-4 sm:p-5">
          {step === 0 && (
            <div className="animate-rise">
              <div className="mb-4">
                <h2 className="font-display text-[18px] font-semibold text-ink">What are you building?</h2>
                <p className="mt-1 text-[11.5px] text-muted">Twelve supported project types. Each one has its own validation and configuration flow.</p>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {APP_TYPES.map((t) => {
                  const Ico = ICONS[t.icon] ?? Boxes;
                  return (
                    <button
                      key={t.id}
                      onClick={() => selectType(t)}
                      className={cn("group relative flex flex-col items-start rounded-xl border p-3.5 text-left transition hover:-translate-y-0.5 hover:border-lime/50 hover:bg-lime/[0.03]", type?.id === t.id ? "border-lime/60 bg-lime/[0.04]" : "border-line bg-panel")}
                    >
                      <div className="flex w-full items-start justify-between">
                        <div className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-panel2 text-muted transition group-hover:text-lime">
                          <Ico className="h-4 w-4" />
                        </div>
                        {t.tag && <span className="rounded bg-panel2 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-muted">{t.tag}</span>}
                      </div>
                      <div className="mt-3 text-[11.5px] font-semibold text-ink">{t.name}</div>
                      <p className="mt-1 text-[10px] leading-relaxed text-muted">{t.blurb}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && type && (
            <div className="animate-rise">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-[18px] font-semibold text-ink">Add your {type.name.toLowerCase()} source</h2>
                  <p className="mt-1 text-[11.5px] text-muted">Nothing is deleted. U APP validates and explains every limitation before building.</p>
                </div>
                <Badge tone="neutral">{type.name}</Badge>
              </div>
              {!needsUrl(type) && (
                <div className="mb-4 flex gap-1 rounded-lg border border-line bg-panel2/50 p-1">
                  {[
                    { id: "zip" as const, label: "Upload ZIP" },
                    { id: "code" as const, label: "Paste HTML", show: ["html", "cssjs", "other", "advanced"].includes(type.id) },
                  ].filter((x) => x.show !== false).map((m) => (
                    <button key={m.id} onClick={() => setSourceMode(m.id)} className={cn("flex-1 rounded-md px-2 py-1.5 text-[10.5px] font-semibold transition", sourceMode === m.id ? "bg-panel text-ink shadow-sm" : "text-muted hover:text-ink")}>{m.label}</button>
                  ))}
                </div>
              )}
              {needsUrl(type) && (
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel2/50 px-2.5 py-1.5 text-[10px] font-medium text-muted">
                  <Globe2 className="h-3 w-3 text-lime" /> Website URL only — no source code or ZIP required
                </div>
              )}

              {sourceMode === "url" && (
                <div className="space-y-3">
                  <Field label="Website URL" hint="Use a valid HTTPS destination. The generated app opens this exact URL, not a U APP domain." error={urlError}>
                    <Input value={url} onChange={(e) => { setUrl(e.target.value); setUrlError(""); }} placeholder="https://nimbus.example.com" inputMode="url" />
                  </Field>
                  <div className="rounded-xl border border-line bg-panel2/50 p-3.5">
                    <div className="flex items-center gap-2 text-[10.5px] font-semibold text-ink"><ShieldCheck className="h-3.5 w-3.5 text-lime" /> URL checks before build</div>
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {["HTTPS certificate", "Redirect handling", "Frame embedding headers", "Authentication limitations"].map((x) => (
                        <div key={x} className="flex items-center gap-1.5 text-[10px] text-muted"><CheckCircle2 className="h-3 w-3 text-lime" /> {x}</div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <p className="text-[10.5px] leading-relaxed text-muted">Sites that send <span className="font-mono text-ink">X-Frame-Options: DENY</span> or use login providers that block embedded browsers may not render fully. U APP detects and reports this — it never silently pretends the site is embeddable.</p>
                  </div>
                </div>
              )}

              {sourceMode === "zip" && (
                <div>
                  <input ref={fileRef} type="file" accept=".zip,.apk,application/zip,application/vnd.android.package-archive" className="hidden" onChange={(e) => handleZip(e.target.files?.[0])} />
                  {!zip ? (
                    <button onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-line bg-panel2/30 px-4 py-10 text-center transition hover:border-lime/40 hover:bg-lime/[0.02]">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-panel2 text-muted">{zipBusy ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}</div>
                      <div className="mt-3 text-[12px] font-semibold text-ink">{zipBusy ? "Scanning archive…" : "Upload a ZIP project"}</div>
                      <p className="mt-1 max-w-sm text-[10.5px] leading-relaxed text-muted">Nested folders are detected. Max {plan.maxProjectMb} MB on the {plan.name} plan. The original archive is preserved.</p>
                      <span className={buttonClass("secondary", "sm", "mt-3")}>Choose archive</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5 rounded-xl border border-line bg-panel2/50 p-3">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-lime/10 text-lime"><FileArchive className="h-4 w-4" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11.5px] font-semibold text-ink">{zip.name}</div>
                          <div className="text-[9.5px] text-muted">{(zip.size / 1024 / 1024).toFixed(2)} MB · {zip.total} files · {zip.folders} folders</div>
                        </div>
                        <button onClick={() => { setZip(null); setZipAccepted(false); }} className="rounded-lg border border-line p-1.5 text-muted hover:text-ink" aria-label="Remove archive"><X className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Supported", n: zip.supported.length, tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", icon: FileCheck2 },
                          { label: "Partial", n: zip.partial.length, tone: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", icon: FileWarning },
                          { label: "Unsupported", n: zip.unsupported.length, tone: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", icon: TriangleAlert },
                        ].map((s) => (
                          <div key={s.label} className={cn("rounded-lg border border-line p-2.5", s.bg)}>
                            <s.icon className={cn("h-3.5 w-3.5", s.tone)} />
                            <div className={cn("mt-1 font-display text-[18px] font-bold", s.tone)}>{s.n}</div>
                            <div className="text-[9px] font-medium text-muted">{s.label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="max-h-[190px] overflow-y-auto rounded-xl border border-line">
                        {[
                          ...zip.supported.map((f) => ({ ...f, cat: "supported" as const, reason: f.type })),
                          ...zip.partial.map((f) => ({ ...f, cat: "partial" as const })),
                          ...zip.unsupported.map((f) => ({ ...f, cat: "unsupported" as const })),
                        ].slice(0, 80).map((f, i) => (
                          <div key={`${f.file}${i}`} className="flex items-start gap-2 border-b border-line px-2.5 py-1.5 last:border-0">
                            <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", f.cat === "supported" ? "bg-emerald-400" : f.cat === "partial" ? "bg-amber-400" : "bg-rose-400")} />
                            <span className="min-w-0 flex-1 truncate font-mono text-[9px] text-ink/80">{f.file}</span>
                            <span className="max-w-[45%] text-right text-[8.5px] leading-tight text-muted">{f.reason}</span>
                          </div>
                        ))}
                        {zip.total === 0 && <div className="px-3 py-6 text-center text-[10px] text-muted">The archive is empty.</div>}
                      </div>
                      {(zip.partial.length > 0 || zip.unsupported.length > 0) && (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                          <p className="text-[10.5px] leading-relaxed text-muted">
                            <span className="font-semibold text-ink">{zip.partial.length + zip.unsupported.length} file(s) need your decision.</span> A supported language is not a promise of compilation. PHP remains server-side; Java/Kotlin need Gradle configuration. Files are never silently removed.
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button size="sm" variant={zipAccepted ? "lime" : "secondary"} onClick={() => setZipAccepted(true)}><Check className="h-3.5 w-3.5" /> Continue with supported files</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setZip(null); setZipAccepted(false); }}>Cancel project</Button>
                          </div>
                        </div>
                      )}
                      {zip.partial.length === 0 && zip.unsupported.length === 0 && (
                        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                          <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> All files are supported. No removal required.</div>
                          <Button size="sm" variant={zipAccepted ? "lime" : "secondary"} onClick={() => setZipAccepted(true)}>{zipAccepted ? "Accepted" : "Accept source"}</Button>
                        </div>
                      )}
                    </div>
                  )}
                  {zipError && <p className="mt-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-[10.5px] font-medium text-rose-500">{zipError}</p>}
                </div>
              )}

              {sourceMode === "code" && (
                <Field label="HTML source" hint="Your markup and inline styles are wrapped into the app shell. External assets must be reachable over HTTPS.">
                  <Textarea value={code} onChange={(e) => setCode(e.target.value)} className="min-h-[220px] font-mono text-[11px]" placeholder={'<!doctype html>\n<html>\n  <head><meta name="viewport" content="width=device-width"></head>\n  <body>\n    <h1>Hello from my app</h1>\n  </body>\n</html>'} />
                </Field>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="animate-rise">
              <div className="mb-4">
                <h2 className="font-display text-[18px] font-semibold text-ink">App details</h2>
                <p className="mt-1 text-[11.5px] text-muted">This is what appears on the home screen, the splash screen and inside Android settings.</p>
              </div>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="App name" error={errors.name}>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nimbus Store" maxLength={32} />
                </Field>
                <Field label="Package ID" hint="Lowercase, dot-separated, starts with a letter." error={errors.packageId}>
                  <Input value={packageId} onChange={(e) => setPackageId(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))} placeholder="app.nimbus.store" className="font-mono text-[12px]" />
                </Field>
                <Field label="App version">
                  <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" className="font-mono" />
                </Field>
                <Field label="Build type" hint={`Available on ${plan.name}: ${buildOptions.join(", ")}`}>
                  <Select value={buildType} onChange={(e) => setBuildType(e.target.value)}>
                    {buildOptions.map((b) => <option key={b}>{b}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="mt-3 grid gap-3.5 sm:grid-cols-2">
                <Field label="Launch icon" hint="Choose a colour or upload a PNG (512×512 recommended).">
                  <div className="flex items-center gap-2">
                    <input ref={iconRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => setIconName(e.target.files?.[0]?.name ?? "")} />
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display text-[16px] font-bold" style={{ background: iconColor, color: "#111605" }}>{(name || "U").slice(0, 1).toUpperCase()}</div>
                    <Button variant="secondary" size="sm" onClick={() => iconRef.current?.click()}><Upload className="h-3.5 w-3.5" /> Upload</Button>
                    {iconName && <span className="truncate text-[9px] text-muted">{iconName}</span>}
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    {["#c9f65b", "#a5f3fc", "#b79cff", "#fbbf24", "#f472b6", "#34d399", "#fb923c"].map((c) => (
                      <button key={c} onClick={() => setIconColor(c)} className={cn("h-5 w-5 rounded-full border-2", iconColor === c ? "border-ink" : "border-transparent")} style={{ background: c }} aria-label={`Icon colour ${c}`} />
                    ))}
                  </div>
                </Field>
                <Field label="Splash background" hint="Shown while the app shell initialises.">
                  <div className="flex items-center gap-2">
                    <input type="color" value={splashColor} onChange={(e) => setSplashColor(e.target.value)} className="h-11 w-11 cursor-pointer rounded-lg border border-line bg-panel2 p-1" aria-label="Splash background colour" />
                    <Input value={splashColor} onChange={(e) => setSplashColor(e.target.value)} className="font-mono text-[12px]" />
                  </div>
                </Field>
              </div>
              <div className="mt-3 grid gap-3.5 sm:grid-cols-2">
                <Field label="Navigation style">
                  <Select value={nav} onChange={(e) => setNav(e.target.value)}>
                    {["Bottom navigation", "Top tabs", "Side drawer", "No navigation (full screen)", "Floating dock"].map((x) => <option key={x}>{x}</option>)}
                  </Select>
                </Field>
                <Field label="Back button behaviour">
                  <Select value={back} onChange={(e) => setBack(e.target.value)}>
                    {["History aware", "Exit on first press", "Confirm before exit", "Return to home"].map((x) => <option key={x}>{x}</option>)}
                  </Select>
                </Field>
                <Field label="Offline behavior">
                  <Select value={offline} onChange={(e) => setOffline(e.target.value)}>
                    {["Built-in U APP offline page", "Custom offline HTML", "Browser error only"].map((x) => <option key={x}>{x}</option>)}
                  </Select>
                </Field>
                <Field label="Network settings">
                  <Select value={network} onChange={(e) => setNetwork(e.target.value)}>
                    {["Wi-Fi + mobile data", "Wi-Fi only", "Mobile data only"].map((x) => <option key={x}>{x}</option>)}
                  </Select>
                </Field>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-rise">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-[18px] font-semibold text-ink">Android permissions</h2>
                  <p className="mt-1 text-[11.5px] text-muted">Request only what your app genuinely needs. permission.txt is generated from this selection.</p>
                </div>
                <Badge tone="neutral">{permissions.length} selected</Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {PERMISSIONS.map((p) => {
                  const on = permissions.includes(p.id);
                  const sensitive = p.level.includes("sensitive");
                  return (
                    <button key={p.id} onClick={() => setPermissions((v) => (on ? v.filter((x) => x !== p.id) : [...v, p.id]))} className={cn("flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition", on ? "border-lime/40 bg-lime/[0.04]" : "border-line bg-panel hover:bg-panel2/50")}>
                      <span className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border", on ? "border-lime bg-lime text-limeink" : "border-line")}>{on && <Check className="h-3 w-3" />}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-ink">{p.name}</span>
                          <span className={cn("rounded px-1 py-0.5 text-[7.5px] font-bold uppercase", sensitive ? "bg-rose-500/10 text-rose-500" : p.level === "Runtime" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-panel2 text-muted")}>{p.level}</span>
                        </div>
                        <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted">{p.why}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 overflow-hidden rounded-xl border border-line bg-[#0a0c10]">
                <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
                  <span className="font-mono text-[9px] text-white/45">permission.txt · preview</span>
                  <span className="font-mono text-[8px] uppercase tracking-wider text-lime">{permissions.length} entries</span>
                </div>
                <pre className="max-h-32 overflow-auto p-3 font-mono text-[9px] leading-relaxed text-[#c9d1c2]">{permissions.map((p) => `<uses-permission android:name="${permissionLines[p] ?? p}" />`).join("\n") || "No permissions selected."}</pre>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-rise">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-[18px] font-semibold text-ink">Monetise with ads</h2>
                  <p className="mt-1 text-[11.5px] text-muted">Connect an official SDK, choose formats and control when ads appear.</p>
                </div>
                <Badge tone={adsEligible ? "green" : "amber"}>{adsEligible ? `${plan.name} · eligible` : "Upgrade required"}</Badge>
              </div>

              {!adsEligible ? (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-xl border border-line bg-panel2/50 p-5">
                    <div className="absolute right-3 top-3 rounded-full border border-line bg-panel px-2 py-1 text-[9px] font-bold uppercase text-muted"><Lock className="mr-1 inline h-3 w-3" /> Locked</div>
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-panel text-muted"><Zap className="h-5 w-5" /></div>
                    <h3 className="mt-3 font-display text-[16px] font-semibold text-ink">Ad integration is disabled on the Free plan</h3>
                    <p className="mt-1.5 max-w-lg text-[11px] leading-relaxed text-muted">
                      Free apps can still be created within your monthly credits, but ad network credentials cannot be
                      activated and ad configuration is excluded from free builds. Upgrade to Creator or above to monetise.
                    </p>
                    <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                      {["16 supported ad networks", "8 ad formats", "Automatic or manual timing", "Official SDK configuration"].map((f) => (
                        <div key={f} className="flex items-center gap-1.5 text-[10px] text-muted"><CheckCircle2 className="h-3 w-3 text-lime" /> {f}</div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link to="/app/plans" className={buttonClass("lime", "sm")}><Zap className="h-3.5 w-3.5" /> Upgrade plan</Link>
                      <Button variant="secondary" size="sm" onClick={() => { setAdsChoice("skip"); setStep(5); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Skip ads & continue <ArrowRight className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted">The skip button opens the UI template picker immediately. No waiting.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-1 rounded-lg border border-line bg-panel2/50 p-1">
                    <button onClick={() => setAdsChoice("configure")} className={cn("flex-1 rounded-md px-2 py-1.5 text-[10.5px] font-semibold", adsChoice === "configure" ? "bg-panel text-ink shadow-sm" : "text-muted")}>Configure ads</button>
                    <button onClick={() => setAdsChoice("skip")} className={cn("flex-1 rounded-md px-2 py-1.5 text-[10.5px] font-semibold", adsChoice === "skip" ? "bg-panel text-ink shadow-sm" : "text-muted")}>Skip ads</button>
                  </div>
                  {adsChoice === "configure" ? (
                    <>
                      <div>
                        <div className="mb-1.5 text-[11px] font-semibold text-ink">Ad network</div>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                          {NETWORKS.map((n) => (
                            <button key={n.id} onClick={() => { setNetworkId(n.id); setCreds({}); }} className={cn("rounded-lg border px-2 py-2 text-left text-[9.5px] font-medium leading-tight transition", networkId === n.id ? "border-lime/50 bg-lime/[0.05] text-ink" : "border-line bg-panel text-muted hover:text-ink")}>{n.name}</button>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {selectedNetwork.fields.map((f) => (
                          <Field key={f.key} label={f.label} hint={f.hint}>
                            <Input value={creds[f.key] ?? ""} onChange={(e) => setCreds({ ...creds, [f.key]: e.target.value })} placeholder={f.key === "app_id" ? "ca-app-pub-…" : "Enter from network dashboard"} className="font-mono text-[11px]" />
                          </Field>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-panel2/40 px-3 py-2">
                        <div>
                          <div className="text-[10.5px] font-semibold text-ink">Manual ad loading</div>
                          <div className="text-[9px] text-muted">Allow load and reload requests from your app code.</div>
                        </div>
                        <label className="flex items-center gap-2 text-[9.5px] font-medium text-muted">
                          <input type="checkbox" checked={manualAds} onChange={(e) => setManualAds(e.target.checked)} className="h-3.5 w-3.5 accent-lime" />
                          {manualAds ? "Enabled" : "Disabled"}
                        </label>
                      </div>
                      <div>
                        <div className="mb-1.5 text-[11px] font-semibold text-ink">Ad formats</div>
                        <div className="flex flex-wrap gap-1.5">
                          {AD_FORMATS.map((f) => (
                            <button key={f} onClick={() => flipFormat(f)} className={cn("rounded-lg border px-2 py-1.5 text-[9.5px] font-medium transition", formats.includes(f) ? "border-lime/50 bg-lime/[0.06] text-ink" : "border-line bg-panel text-muted hover:text-ink")}>
                              {formats.includes(f) ? "✓ " : "+ "}{f}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        <Field label="Placement timing" hint="Optional automatic load timing; manual load remains available.">
                          <Select value={timing} onChange={(e) => setTiming(e.target.value)}>{AD_TIMINGS.map((t) => <option key={t}>{t}</option>)}</Select>
                        </Field>
                        {timing === "Custom" && <Field label="Custom timing"><Input value={customTiming} onChange={(e) => setCustomTiming(e.target.value)} placeholder="e.g. every 2 minutes" /></Field>}
                      </div>
                      <div className="rounded-xl border border-line bg-panel2/40 p-3">
                        <label className="flex items-start gap-2 text-[10px] leading-relaxed text-muted">
                          <input type="checkbox" checked={adConsent} onChange={(e) => setAdConsent(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-lime" />
                          I confirm the credentials are mine, official SDK versions and consent requirements will be followed, and ads will not be placed in deceptive or policy-violating positions.
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="lime" size="sm" disabled={!adConsent || formats.length === 0} onClick={() => { setAdsChoice("configure"); setStep(5); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                          Save ads & choose UI <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => { setAdsChoice("skip"); setStep(5); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Skip ads & continue</Button>
                        <a href={selectedNetwork.docs} target="_blank" rel="noreferrer" className={buttonClass("ghost", "sm")}>Official SDK docs</a>
                        <Link to="/api-doce" className={buttonClass("ghost", "sm")}>API documentation</Link>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-line bg-panel2/50 p-6 text-center">
                      <Layers className="mx-auto h-6 w-6 text-muted" />
                      <p className="mt-2 text-[12px] font-semibold text-ink">Ads skipped for this build</p>
                      <p className="mt-1 text-[10.5px] text-muted">You can configure ads later from the project before rebuilding.</p>
                      <Button variant="lime" size="sm" className="mt-3" onClick={() => { setAdsChoice("skip"); setStep(5); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Choose UI template <ArrowRight className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="animate-rise">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-[18px] font-semibold text-ink">Choose a UI template</h2>
                  <p className="mt-1 text-[11.5px] text-muted">54 designs. Every card is a working preview, not an illustration.</p>
                </div>
                <Badge tone="lime">{TEMPLATES.length} templates</Badge>
              </div>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                  <Input value={templateQ} onChange={(e) => setTemplateQ(e.target.value)} placeholder="Search templates…" className="pl-9" />
                </div>
                <Select value={templateCat} onChange={(e) => setTemplateCat(e.target.value)} className="sm:w-40">
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </Select>
              </div>
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-2">
                {categories.map((c) => (
                  <button key={c} onClick={() => setTemplateCat(c)} className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[9.5px] font-semibold", templateCat === c ? "border-ink/20 bg-ink text-bg" : "border-line text-muted hover:text-ink")}>{c}</button>
                ))}
              </div>
              <div className="mt-2 grid max-h-[430px] grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
                {templates.map((t) => (
                  <button key={t.id} onClick={() => setTemplateId(t.id)} className={cn("group relative rounded-xl border p-1.5 text-left transition", templateId === t.id ? "border-lime bg-lime/[0.04] ring-1 ring-lime/30" : "border-line bg-panel hover:border-ink/25")}>
                    <TemplateMini template={t} compact />
                    <div className="mt-1.5 flex items-center justify-between gap-1 px-0.5">
                      <span className="truncate text-[9.5px] font-semibold text-ink">{t.name}</span>
                      {templateId === t.id ? <span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-lime text-limeink"><Check className="h-2.5 w-2.5" /></span> : <span className="text-[8px] text-muted">#{t.id}</span>}
                    </div>
                    <div className="px-0.5 text-[8px] text-muted">{t.category} · {t.layout}</div>
                  </button>
                ))}
                {templates.length === 0 && <p className="col-span-full py-8 text-center text-[11px] text-muted">No templates match “{templateQ}”.</p>}
              </div>
              {selectedTemplate && (
                <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-lime/25 bg-lime/5 px-2.5 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-lime" />
                  <span className="text-[10.5px] font-medium text-ink">Selected: {selectedTemplate.name} — {selectedTemplate.blurb}</span>
                </div>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="animate-rise">
              <div className="mb-4">
                <h2 className="font-display text-[18px] font-semibold text-ink">Final configuration</h2>
                <p className="mt-1 text-[11.5px] text-muted">Review once. One app creation credit is reserved when validation passes.</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-line">
                {[
                  ["App name", name || "—"],
                  ["Package ID", packageId || "—"],
                  ["Project type", type?.name ?? "—"],
                  ["Source", sourceMode === "url" ? url || "—" : sourceMode === "zip" ? zip?.name ?? "—" : "Pasted HTML"],
                  ["UI template", selectedTemplate ? `${selectedTemplate.name} · #${selectedTemplate.id}` : "—"],
                  ["Build type", buildType],
                  ["Version", version],
                  ["Permissions", `${permissions.length} selected`],
                  ["Ads", adsChoice === "configure" && adsEligible ? `${selectedNetwork.name} · ${formats.length} formats · ${timing}` : "Skipped / not eligible"],
                  ["Offline behaviour", offline],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-4 border-b border-line px-3 py-2 text-[10.5px] last:border-0">
                    <span className="text-muted">{k}</span>
                    <span className="max-w-[65%] break-words text-right font-medium text-ink">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-lime/25 bg-lime/[0.04] p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
                <div>
                  <div className="text-[10.5px] font-semibold text-ink">Credit reservation</div>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted">Remaining: {quota.remaining} of {quota.allowance}. This creation will reserve 1 credit. If validation fails before the build, it is released. Rebuilds never cost a credit.</p>
                </div>
              </div>
              <label className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-muted">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-lime" />
                I confirm the source is mine or licensed, unsupported files were reviewed and not silently removed, and I understand PHP/server code cannot become native Android code.
              </label>
              {!agree && <p className="mt-1.5 text-[9.5px] font-medium text-amber-600 dark:text-amber-400">Confirm the checklist to enable the build.</p>}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-2 border-t border-line pt-4">
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft className="h-3.5 w-3.5" /> Back</Button>
            <div className="flex items-center gap-2">
              <span className="hidden text-[9.5px] text-muted sm:block">Step {step + 1} of 7</span>
              {step < 6 ? (
                <Button variant="lime" size="sm" onClick={next} disabled={step === 0 ? !type : step === 1 ? !canProceed : step === 5 ? !templateId : step === 6 ? !agree : false}>
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button variant="lime" size="sm" onClick={build} disabled={!agree || quota.remaining <= 0}>
                  <Zap className="h-3.5 w-3.5" /> {quota.remaining <= 0 ? "No credits remaining" : "Create app & reserve credit"}
                </Button>
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Build summary</h3>
              <Badge tone={quota.remaining > 0 ? "lime" : "rose"}>{quota.remaining}/{quota.allowance}</Badge>
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl font-display text-[15px] font-bold" style={{ background: iconColor, color: "#111605" }}>{(name || "U").slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0">
                <div className="truncate text-[11.5px] font-semibold text-ink">{name || "Untitled app"}</div>
                <div className="truncate font-mono text-[8.5px] text-muted">{packageId || "app.package.id"}</div>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {[["Type", type?.name ?? "Not selected"], ["Source", sourceMode === "url" ? "Website URL" : sourceMode === "zip" ? "ZIP upload" : "HTML paste"], ["Template", selectedTemplate?.name ?? "Not selected"], ["Build", buildType], ["Ads", adsChoice === "configure" && adsEligible ? `${selectedNetwork.name}${manualAds ? " · manual load" : ""}` : "Skipped"]].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2 text-[9.5px]">
                  <span className="text-muted">{k}</span>
                  <span className="max-w-[60%] truncate text-right font-medium text-ink">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-line pt-2.5">
              <div className="flex items-center justify-between text-[9px] text-muted"><span>Credits after creation</span><span className="font-semibold text-ink">{Math.max(0, quota.remaining - 1)}</span></div>
              <Progress value={quota.allowance ? (Math.max(0, quota.remaining - 1) / quota.allowance) * 100 : 0} className="mt-1.5" />
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Included</h3>
            <div className="mt-2 space-y-1.5">
              {plan.features.slice(0, 5).map((f) => (
                <div key={f} className="flex items-start gap-1.5 text-[9.5px] leading-relaxed text-muted"><Check className="mt-0.5 h-3 w-3 shrink-0 text-lime" /> {f}</div>
              ))}
            </div>
            <Link to="/app/plans" className={buttonClass("secondary", "sm", "mt-3 w-full")}>Compare plans</Link>
          </Card>
          <div className="rounded-xl border border-line bg-panel/50 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-ink"><Lock className="h-3 w-3 text-lime" /> Safety by default</div>
            <p className="mt-1 text-[9px] leading-relaxed text-muted">ZIP-slip and archive-bomb checks, isolated builds, hashed API keys, and 9-minute artifact deletion.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BuildComplete({ appId, name, packageId, template, remaining }: { appId: string; name: string; packageId: string; template: string; remaining: number }) {
  const { state } = useStore();
  const app = state.apps.find((a) => a.id === appId);
  const [progress, setProgress] = useState(30);
  useEffect(() => {
    if (!app) return;
    if (app.buildStatus === "ready") setProgress(100);
    else if (app.buildStatus === "building") setProgress(65);
    else setProgress(85);
  }, [app]);
  return (
    <div className="mx-auto max-w-2xl">
      <div className="animate-rise rounded-2xl border border-lime/25 bg-[linear-gradient(160deg,rgba(201,246,91,.08),transparent_60%)] p-6 text-center sm:p-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lime text-limeink"><Check className="h-7 w-7" /></div>
        <h1 className="mt-4 font-display text-[26px] font-bold tracking-tight text-ink">{app?.buildStatus === "ready" ? "App is ready." : "App created."}</h1>
        <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-muted">{app?.buildStatus === "ready" ? "Your app package is built and ready to install. One creation credit was committed." : "Your configuration passed validation and one creation credit was committed. Your installable app package is being prepared."}</p>
        <div className="mx-auto mt-4 max-w-sm rounded-xl border border-line bg-panel p-3 text-left">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime font-display font-bold text-limeink">{name.slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold text-ink">{name}</div>
              <div className="truncate font-mono text-[9px] text-muted">{packageId} · {appId}</div>
            </div>
            <Badge tone={app?.buildStatus === "ready" ? "green" : "sky"}>{app?.buildStatus === "ready" ? "Ready" : "Building"}</Badge>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[9px] text-muted"><span>{app?.buildStatus === "ready" ? "Package ready" : "Build preparation"}</span><span>{progress}%</span></div>
          <Progress value={progress} className="mt-1" />
        </div>
        <div className="mx-auto mt-3 max-w-sm rounded-lg border border-lime/25 bg-lime/5 px-3 py-2 text-left">
          <p className="text-[9.5px] leading-relaxed text-muted"><span className="font-semibold text-ink">Your app is installable now.</span> APK/AAB is produced automatically on the U APP platform account and appears on the download page when it finishes. No GitHub account or token is needed from you.</p>
        </div>
        <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
          <Link to={`/app/apps/${appId}/download`} className={buttonClass("lime", "md")}><Download className="h-4 w-4" /> Download / install app</Link>
          <Link to={`/app/apps/${appId}`} className={buttonClass("secondary", "md")}>View project</Link>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[9.5px] text-muted">
          <span><Sparkles className="mr-1 inline h-3 w-3 text-lime" />Template: {template}</span>
          <span><Zap className="mr-1 inline h-3 w-3 text-lime" />{remaining} credits remain</span>
          <span><Plus className="mr-1 inline h-3 w-3 text-lime" />{app?.permissions.length ?? 0} permissions</span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          { t: "Temporary downloads", d: "Your source package link expires in nine minutes. Rebuild any time without a new credit.", href: `/app/apps/${appId}/download`, label: "Open downloads" },
          { t: "Need to change something?", d: "Reconfigure and rebuild the same project, or start a different app with your remaining credits.", href: "/app/create", label: "Create another" },
        ].map((c) => (
          <Card key={c.t} className="p-4">
            <div className="text-[11.5px] font-semibold text-ink">{c.t}</div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted">{c.d}</p>
            <Link to={c.href} className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-ink hover:text-lime">{c.label} <ArrowRight className="h-3 w-3" /></Link>
          </Card>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-3 text-[10px] text-muted">
        <Link to="/app/apps" className="hover:text-ink">My apps</Link><span>·</span><Link to="/app" className="hover:text-ink">Dashboard</Link><span>·</span><Link to="/app/support" className="hover:text-ink">Support</Link>
      </div>
    </div>
  );
}

