import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Cloud,
  Code2,
  CreditCard,
  Download,
  GitBranch,
  Globe2,
  KeyRound,
  LifeBuoy,
  Lock,
  Mail,
  MessageSquare,
  Moon,
  Paperclip,
  RefreshCw,
  Send,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  TriangleAlert,
  User,
  X,
} from "lucide-react";
import { Badge, Button, buttonClass, Card, Empty, Field, Input, Modal, Textarea, Toggle, useToast } from "@/components/ui";
import { PageHeader } from "@/components/Shell";
import { EMAIL_API, firebaseConfig, SUPPORT_EMAIL } from "@/data/catalog";
import { clearOwnerRunner, platformRunner, platformRunnerSource, saveOwnerRunner, testPlatformCredential, parseRepoSlug } from "@/lib/buildService";
import { getUpiConfig, saveUpiConfig, clearUpiConfig } from "@/lib/payments";
import { isFirebaseReady } from "@/lib/firebase";
import { formatDate, relativeTime, useStore } from "@/lib/store";
import { cn } from "@/utils/cn";

/* ------------------------------------------------------------------ Support */

export function SupportPage() {
  const { state, addSupport, retrySupport } = useStore();
  const { toast } = useToast();
  const user = state.user!;
  const [subject, setSubject] = useState("");
  const [email, setEmail] = useState(user.email);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [error, setError] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const last = state.support.find((s) => s.id === lastId);

  const totalSize = files.reduce((a, f) => a + f.size, 0);
  const attach = (list: FileList | null) => {
    if (!list) return;
    setError("");
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= 4) { setError("Attach up to 4 files."); break; }
      if (f.size > 3 * 1024 * 1024) { setError(`${f.name} is larger than 3 MB.`); continue; }
      if (totalSize + f.size > 3 * 1024 * 1024) { setError("Total attachment preview size cannot exceed 3 MB."); break; }
      if (!next.some((x) => x.name === f.name)) next.push({ name: f.name, size: f.size });
    }
    setFiles(next);
  };

  const submit = () => {
    setError("");
    if (subject.trim().length < 3) { setError("Add a clear subject."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid contact email."); return; }
    if (message.trim().length < 20) { setError("Write at least 20 characters so we can help properly."); return; }
    if (message.length > 2000) { setError("Keep the message under 2,000 characters."); return; }
    const id = addSupport({ subject: subject.trim(), email: email.trim(), message: message.trim(), attachments: files });
    setLastId(id);
    setSubject("");
    setMessage("");
    setFiles([]);
    toast("Message saved to support history. Email delivery is pending configuration.", "info");
  };

  const topics = [
    { icon: CreditCard, t: "Payments & activation", d: "UTR, order ID, subscription status" },
    { icon: Code2, t: "Build errors", d: "Gradle, ZIP analysis, unsupported files" },
    { icon: Globe2, t: "App conversion", d: "Website, HTML, PHP or native projects" },
    { icon: KeyRound, t: "API integration", d: "Keys, endpoints, quota, rate limits" },
    { icon: User, t: "Account access", d: "Verification and sign-in problems" },
  ];

  return (
    <div>
      <PageHeader
        title="Support"
        subtitle="A real conversation about payments, builds, conversion, API or your account."
        eyebrow="Help centre"
        actions={<a href={`mailto:${SUPPORT_EMAIL}`} className={buttonClass("secondary", "md")}><Mail className="h-4 w-4" /> Email support</a>}
      />
      <div className="grid gap-4 lg:grid-cols-[1.5fr_.85fr]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-panel2/35 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-lime text-[11px] font-bold text-limeink">UA</div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-panel bg-emerald-400" />
                </div>
                <div>
                  <div className="text-[11.5px] font-semibold text-ink">U APP Support</div>
                  <div className="text-[9.5px] text-muted">Text-based support · typically replies within a day</div>
                </div>
              </div>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2 py-1.5 font-mono text-[9px] text-muted hover:text-ink"><Mail className="h-3 w-3" /> {SUPPORT_EMAIL}</a>
            </div>

            <div className="border-b border-line px-4 py-4">
              <div className="max-w-md rounded-xl rounded-tl-sm border border-line bg-panel2/60 px-3 py-2.5">
                <p className="text-[10.5px] leading-relaxed text-ink/85">Hi {user.name.split(" ")[0]} 👋 Tell us what happened. Include your project ID or order ID so we can look it up. Attachments can be previewed here, but the email API delivers <span className="font-semibold">text only</span>.</p>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[8.5px] text-muted"><Clock className="h-2.5 w-2.5" /> Automated acknowledgement · not a delivery confirmation</div>
            </div>

            <div className="space-y-3 p-4">
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Field label="Subject">
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. ZIP build failed at Gradle" maxLength={120} />
                </Field>
                <Field label="Contact email">
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" />
                </Field>
              </div>
              <Field label="Message" hint={`${message.length}/2000 characters · text only`}>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 2000))} className="min-h-[130px]" placeholder="Describe the issue, what you expected, and the exact error you saw…" />
              </Field>
              <div className="flex flex-wrap items-center gap-2">
                <input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf,text/plain" className="hidden" onChange={(e) => attach(e.target.files)} />
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}><Paperclip className="h-3.5 w-3.5" /> Attach preview</Button>
                <span className="text-[9px] text-muted">{(totalSize / 1024 / 1024).toFixed(2)}/3 MB preview · never transmitted by the email API</span>
                <Button variant="lime" size="sm" className="ml-auto" onClick={submit}><Send className="h-3.5 w-3.5" /> Send message</Button>
              </div>
              {error && <p className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-[10px] font-medium text-rose-500">{error}</p>}
              {files.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {files.map((f) => (
                    <div key={f.name} className="flex items-center gap-1.5 rounded-lg border border-line bg-panel2/60 px-2 py-1">
                      <Paperclip className="h-3 w-3 text-muted" />
                      <span className="max-w-[150px] truncate text-[9px] font-medium text-ink">{f.name}</span>
                      <span className="text-[8px] text-muted">{(f.size / 1024).toFixed(0)} KB</span>
                      <button onClick={() => setFiles(files.filter((x) => x.name !== f.name))} className="text-muted hover:text-rose-500" aria-label={`Remove ${f.name}`}><X className="h-2.5 w-2.5" /></button>
                    </div>
                  ))}
                </div>
              )}
              <p className="flex items-start gap-1.5 text-[8.5px] leading-relaxed text-muted"><ShieldCheck className="mt-0.5 h-2.5 w-2.5 shrink-0 text-lime" /> Protected against spam and validated server-side. Attachments are preview-only because the supplied email API accepts a receiver and text body only.</p>
            </div>
          </Card>

          {last && (
            <Card className="overflow-hidden border-amber-500/25">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
                <div className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5 text-muted" /><span className="text-[11.5px] font-semibold text-ink">{last.subject}</span><span className="font-mono text-[8px] text-muted">{last.id}</span></div>
                <Badge tone="amber">Delivery pending</Badge>
              </div>
              <div className="space-y-2 p-4">
                <div className="ml-auto max-w-[85%] rounded-xl rounded-tr-sm border border-lime/20 bg-lime/[0.05] px-3 py-2">
                  <div className="text-[9.5px] leading-relaxed text-ink/85">{last.message}</div>
                  <div className="mt-1 text-right text-[8px] text-muted">{last.attempts} attempt{last.attempts === 1 ? "" : "s"} · {relativeTime(last.createdAt)}</div>
                </div>
                <div className="max-w-[92%] rounded-xl rounded-tl-sm border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"><AlertCircle className="h-3 w-3" /> Email not delivered</div>
                  <p className="mt-1 text-[9.5px] leading-relaxed text-muted">Your message is safely stored with delivery status <span className="font-mono">not_sent</span>. The OTP email API requires a server-side PHP request with credentials; this preview has no server runtime, so nothing is falsely marked as delivered. You can retry once deployment is configured.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => { retrySupport(last.id); toast("Retry recorded. Delivery still requires the server-side email API.", "info"); }}><RefreshCw className="h-3 w-3" /> Retry delivery</Button>
                    <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(last.subject)}&body=${encodeURIComponent(last.message)}`} className={buttonClass("lime", "sm")}><Mail className="h-3 w-3" /> Send via email app</a>
                  </div>
                </div>
                {last.attachments.length > 0 && <p className="text-[8.5px] text-muted">Previewed files (not sent): {last.attachments.map((a) => a.name).join(", ")}</p>}
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-[12px] font-semibold text-ink">Support history</h2>
              <span className="text-[9px] text-muted">{state.support.length} request{state.support.length === 1 ? "" : "s"}</span>
            </div>
            {state.support.length === 0 ? (
              <div className="p-4"><Empty icon={<LifeBuoy className="h-4 w-4" />} title="No support requests yet" body="Your messages and delivery metadata will appear here with timestamps." /></div>
            ) : (
              <div className="divide-y divide-line">
                {state.support.map((r) => (
                  <button key={r.id} onClick={() => setLastId(r.id)} className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition hover:bg-panel2/40">
                    <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-panel2 text-muted"><Mail className="h-3.5 w-3.5" /></div>
                    <div className="min-w-0 flex-1"><div className="truncate text-[10.5px] font-semibold text-ink">{r.subject}</div><div className="truncate text-[9px] text-muted">{r.message}</div></div>
                    <div className="shrink-0 text-right"><Badge tone={r.delivery === "delivered" ? "green" : r.delivery === "failed" ? "rose" : "amber"} className="px-1.5 py-0.5 text-[7.5px]">{r.delivery.replace("_", " ")}</Badge><div className="mt-1 text-[8px] text-muted">{relativeTime(r.createdAt)}</div></div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-3">
          <Card className="border-lime/25 bg-[linear-gradient(150deg,rgba(201,246,91,.08),transparent)] p-4">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-lime/15 text-lime"><Mail className="h-4 w-4" /></div>
            <h2 className="mt-2.5 font-display text-[16px] font-semibold text-ink">Prefer email?</h2>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">Reach the monitored support inbox directly for payment activation or account recovery.</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-2 inline-block break-all text-[10.5px] font-semibold text-ink underline decoration-line underline-offset-2 hover:text-lime">{SUPPORT_EMAIL}</a>
            <div className="mt-2.5 flex flex-wrap gap-1.5"><Badge tone="green"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Inbox monitored</Badge><Badge tone="neutral">Usually within a day</Badge></div>
          </Card>

          <Card className="p-4">
            <h2 className="text-[11.5px] font-semibold text-ink">Quick topics</h2>
            <div className="mt-2 space-y-1.5">
              {topics.map((t) => (
                <button key={t.t} onClick={() => { setSubject(t.t); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex w-full items-start gap-2 rounded-lg border border-line bg-panel2/30 px-2.5 py-2 text-left transition hover:border-lime/30">
                  <t.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                  <div><div className="text-[9.5px] font-semibold text-ink">{t.t}</div><div className="text-[8.5px] leading-relaxed text-muted">{t.d}</div></div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-ink"><Server className="h-3.5 w-3.5 text-amber-500" /> Delivery setup</div>
            <div className="mt-2 rounded-lg border border-line bg-panel2/40 p-2.5">
              <div className="text-[8px] font-semibold uppercase tracking-wider text-muted">Endpoint</div>
              <div className="mt-0.5 break-all font-mono text-[8.5px] text-ink/80">{EMAIL_API}</div>
              <div className="mt-1.5 flex items-center justify-between"><span className="text-[8.5px] text-muted">Receiver</span><span className="font-mono text-[8px] text-ink/80">{SUPPORT_EMAIL}</span></div>
            </div>
            <p className="mt-2 text-[8.5px] leading-relaxed text-muted">The server sends a text body through the provided email API. Because that API may prefix the body with “Your OTP code is:”, support messages must account for that behaviour.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Settings */

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Sun },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "runtime", label: "Runtime config", icon: Server },
  { id: "account", label: "Account & data", icon: Trash2 },
] as const;

export function SettingsPage() {
  const { state, theme, toggleTheme, updateUser, logout, resetWorkspace } = useStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const user = state.user!;
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("profile");
  const platform = platformRunner();
  const platformSource = platformRunnerSource();
  const [ownerRepo, setOwnerRepo] = useState(() => (platform ? `${platform.owner}/${platform.repo}` : ""));
  const [ownerWorkflow, setOwnerWorkflow] = useState(() => platform?.workflow ?? "android-build.yml");
  const [ownerToken, setOwnerToken] = useState("");
  const [ownerMsg, setOwnerMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ownerBusy, setOwnerBusy] = useState(false);
  const [upi, setUpi] = useState(() => getUpiConfig());
  const [upiDraft, setUpiDraft] = useState({ upiId: "", payeeName: "" });
  const [upiMsg, setUpiMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ name: user.name, company: user.company ?? "", bio: user.bio ?? "" });
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const initials = user.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();

  const save = () => {
    if (form.name.trim().length < 2) { toast("Enter your full name.", "error"); return; }
    updateUser({ name: form.name.trim(), company: form.company, bio: form.bio });
    toast("Profile updated.", "success");
  };

  const exportData = () => {
    const data = {
      exported_at: new Date().toISOString(),
      user: { ...user, uid: user.uid },
      apps: state.apps,
      payments: state.payments,
      activities: state.activities,
      support: state.support,
      api_keys: state.apiKeys.map((k) => ({ id: k.id, label: k.label, prefix: k.prefix, createdAt: k.createdAt, revokedAt: k.revokedAt })),
      api_usage: state.apiLogs,
      note: "Passwords and OTPs are never stored. API secrets are stored only as hashes.",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `uapp-account-${user.uid}.json`;
    a.click();
    toast("Account data exported (no passwords or OTPs).", "success");
  };

  const runtime = [
    { key: "FIREBASE_AUTH", label: "Firebase Authentication", value: isFirebaseReady ? `${firebaseConfig.projectId} · connected` : "initialization failed", detail: isFirebaseReady ? "Google and Email/Password sign-in run against your live Firebase project. Authorise this hostname in Firebase Console → Authentication → Settings." : "Firebase SDK failed to initialize. Check the project configuration.", state: "configured", icon: Cloud },
    { key: "OTP_API", label: "OTP & support email API", value: "otpapi-seven.vercel.app", detail: "Must be called server-side with hashed OTP storage. This static deployment cannot dispatch email without the server runtime.", state: "setup", icon: Mail },
    { key: "UAPP_BUILD_SERVICE", label: "Platform APK build service", value: platform ? `${platform.owner}/${platform.repo}` : "owner configuration pending", detail: platform ? "APK/AAB builds run on the U APP platform GitHub account for every user. No user token is ever requested." : "Set the deploy-time build variables once. Until then every app is still delivered as a ready, installable package.", state: platform ? "configured" : "setup", icon: GitBranch },
    { key: "FIREBASE_ADMIN", label: "Firebase Admin credentials", value: "not set", detail: "Server-side ID token verification and privileged database writes.", state: "missing", icon: ShieldCheck },
    { key: "RENDER_STORAGE", label: "9-minute artifact storage", value: "not set", detail: "Temporary volume for signed download links and expiry cleanup.", state: "missing", icon: Download },
    { key: "UPI_MERCHANT", label: "UPI merchant details", value: "not configured", detail: "Merchant UPI ID and payee name must be supplied by the future administrator. Never invented.", state: "missing", icon: CreditCard },
  ] as const;

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Profile, preferences, security and the integration state of this workspace."
        eyebrow="Account"
        actions={<a href={`mailto:${SUPPORT_EMAIL}`} className={buttonClass("secondary", "md")}><LifeBuoy className="h-4 w-4" /> Support</a>}
      />
      <div className="grid gap-4 lg:grid-cols-[190px_1fr]">
        <div className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-medium transition", tab === t.id ? "bg-ink text-bg" : "text-muted hover:bg-panel2 hover:text-ink")}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {tab === "profile" && (
            <Card className="p-4">
              <h2 className="text-[12.5px] font-semibold text-ink">Your profile</h2>
              <p className="text-[10px] text-muted">Stored in Firebase Realtime Database against your UID.</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel2/40 p-3">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-lime font-display text-[20px] font-bold text-limeink">{initials}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-ink">{user.name}</div>
                  <div className="truncate text-[10px] text-muted">{user.email}</div>
                  <div className="mt-1 flex flex-wrap gap-1"><Badge tone={user.emailVerified ? "green" : "amber"}>{user.emailVerified ? "Email verified" : "Email unverified"}</Badge><Badge tone="neutral">{user.provider} auth</Badge></div>
                </div>
                <div className="text-right"><div className="text-[8px] uppercase tracking-wider text-muted">Member since</div><div className="text-[10px] font-medium text-ink">{formatDate(user.createdAt)}</div></div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Full name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Email address" hint="Changing email requires re-verification in production."><Input value={user.email} disabled /></Field>
                <Field label="Company / studio" optional><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Independent" /></Field>
                <Field label="Account UID"><Input value={user.uid} readOnly className="font-mono text-[11px]" /></Field>
              </div>
              <Field label="Short bio" optional><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="min-h-[80px]" placeholder="What are you building?" maxLength={280} /></Field>
              <div className="mt-3 flex justify-end"><Button variant="lime" size="md" onClick={save}><Check className="h-4 w-4" /> Save changes</Button></div>
            </Card>
          )}

          {tab === "appearance" && (
            <Card className="p-4">
              <h2 className="text-[12.5px] font-semibold text-ink">Theme</h2>
              <p className="text-[10px] text-muted">A professional dark and light theme across the landing page and workspace.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  { id: "dark" as const, name: "Obsidian dark", desc: "Near-black surfaces with a lime accent rail.", bg: "#07080b", panel: "#13161d", ink: "#f3f5ee", icon: Moon },
                  { id: "light" as const, name: "Studio light", desc: "Warm paper surfaces with crisp ink typography.", bg: "#f3f4ee", panel: "#ffffff", ink: "#12150f", icon: Sun },
                ].map((t) => (
                  <button key={t.id} onClick={() => { if (theme !== t.id) toggleTheme(); }} className={cn("rounded-xl border p-3 text-left transition", theme === t.id ? "border-lime ring-1 ring-lime/30" : "border-line hover:border-ink/20")}>
                    <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[11px] font-semibold text-ink"><t.icon className="h-3.5 w-3.5" /> {t.name}</span>{theme === t.id && <CheckCircle2 className="h-4 w-4 text-lime" />}</div>
                    <p className="mt-1 text-[9px] text-muted">{t.desc}</p>
                    <div className="mt-2 rounded-lg border p-2" style={{ background: t.bg, borderColor: "rgba(127,127,127,.25)" }}>
                      <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-lime" /><span className="h-1.5 w-14 rounded" style={{ background: t.ink, opacity: 0.7 }} /></div>
                      <div className="mt-1.5 rounded p-1.5" style={{ background: t.panel }}><div className="h-1 w-16 rounded" style={{ background: t.ink, opacity: 0.25 }} /><div className="mt-1 h-1 w-10 rounded bg-lime/60" /></div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {tab === "notifications" && (
            <Card className="p-4">
              <h2 className="text-[12.5px] font-semibold text-ink">Notification preferences</h2>
              <p className="text-[10px] text-muted">Firebase Cloud Messaging device registration is required for push delivery.</p>
              <div className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line">
                {[
                  { k: "notifyBuilds" as const, t: "Build completion", d: "Queued, succeeded, failed and artifact expiry alerts.", on: user.notifyBuilds, icon: Smartphone },
                  { k: "notifyPayments" as const, t: "Payment & subscription", d: "UTR status, approval, rejection and plan expiry.", on: user.notifyPayments, icon: CreditCard },
                  { k: "notifyProduct" as const, t: "Product updates", d: "New templates, networks and API capabilities.", on: user.notifyProduct, icon: Sparkles },
                ].map((n) => (
                  <div key={n.k} className="flex items-center gap-2.5 px-3 py-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-panel2 text-muted"><n.icon className="h-3.5 w-3.5" /></div>
                    <div className="min-w-0 flex-1"><div className="text-[10.5px] font-semibold text-ink">{n.t}</div><div className="text-[9px] leading-relaxed text-muted">{n.d}</div></div>
                    <Toggle checked={n.on} onChange={(v) => { updateUser({ [n.k]: v }); toast(`${n.t} notifications ${v ? "enabled" : "disabled"}.`, "success"); }} />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-panel2/40 px-3 py-2.5">
                <div><div className="text-[10px] font-semibold text-ink">Registered devices</div><div className="text-[9px] text-muted">No push tokens registered in this environment.</div></div>
                <Badge tone="amber">FCM setup required</Badge>
              </div>
              <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                <p className="text-[9px] leading-relaxed text-muted">In production, notifications are sent only to device tokens authorised for the relevant user or project. Private FCM credentials stay on the server.</p>
              </div>
            </Card>
          )}

          {tab === "security" && (
            <div className="space-y-3">
              <Card className="p-4">
                <h2 className="text-[12.5px] font-semibold text-ink">Authentication</h2>
                <div className="mt-2 space-y-1.5">
                  {[
                    ["Provider", user.provider === "google" ? "Google OAuth (Firebase)" : user.provider === "offline" ? "Device-local session" : "Email & password (Firebase)"],
                    ["Email verification", user.emailVerified ? "Verified" : "Not verified"],
                    ["Credential storage", "Passwords never saved in U APP or the Realtime Database"],
                    ["Session", "Firebase Authentication session · ID token issued to this client"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-4 border-b border-line/70 py-1.5 text-[10px] last:border-0"><span className="text-muted">{k}</span><span className="max-w-[65%] text-right font-medium text-ink">{v}</span></div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!user.emailVerified && <Link to="/verify-id" className={buttonClass("lime", "sm")}><Mail className="h-3.5 w-3.5" /> Verify email</Link>}
                  <Link to="/login" className={buttonClass("secondary", "sm")}>Re-authenticate</Link>
                  <Button variant="danger" size="sm" onClick={() => { logout(); navigate("/login"); toast("Signed out of this session.", "success"); }}>Sign out</Button>
                </div>
              </Card>
              <Card className="p-4">
                <h2 className="text-[12.5px] font-semibold text-ink">API keys</h2>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">Secrets are shown once and stored only as SHA-256 hashes. You can revoke keys but cannot view them again.</p>
                <div className="mt-2 flex items-center justify-between rounded-lg border border-line bg-panel2/40 px-3 py-2">
                  <span className="text-[10px] text-muted">{state.apiKeys.filter((k) => !k.revokedAt).length} of 5 active keys</span>
                  <Link to="/api-docs" className="inline-flex items-center gap-1 text-[10px] font-semibold text-ink hover:text-lime">Manage keys <ArrowRight className="h-3 w-3" /></Link>
                </div>
              </Card>
              <Card className="p-4">
                <h2 className="text-[12.5px] font-semibold text-ink">Security features</h2>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {["Firebase ID token verification", "CSRF & XSS protection", "Rate limiting", "OTP attempt limits", "ZIP slip + archive bomb checks", "Isolated builds", "Upload/download signature checks", "Audit logs without secrets"].map((x) => (
                    <div key={x} className="flex items-center gap-1.5 text-[9.5px] text-muted"><Check className="h-3 w-3 text-lime" /> {x}</div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {tab === "runtime" && (
            <div className="space-y-3">
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-[12.5px] font-semibold text-ink">Platform build service</h2>
                    <p className="text-[10px] leading-relaxed text-muted">APK/AAB builds run on the U APP platform account. Users never connect GitHub or paste a token.</p>
                  </div>
                  <Badge tone={platform ? "green" : "lime"}>{platform ? "APK builds enabled" : "Installable builds enabled"}</Badge>
                </div>
                <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                  {[
                    ["App delivery", "Instant installable package"],
                    ["APK / AAB", platform ? "Automatic · platform account" : "Owner setup pending"],
                    ["Target build time", "3–6 minutes"],
                    ["User credentials", "Never requested"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between rounded-lg border border-line bg-panel2/40 px-2.5 py-1.5 text-[9.5px]">
                      <span className="text-muted">{k}</span>
                      <span className="font-medium text-ink">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 rounded-lg border border-line bg-panel2/40 p-2.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-mono text-[8px] uppercase tracking-wider text-muted">owner-only owner/repo (aapke account)</span>
                    <span className="rounded bg-lime/10 px-1.5 py-0.5 text-[7.5px] font-bold uppercase text-lime">mera account</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input value={ownerRepo} onChange={(e) => setOwnerRepo(e.target.value)} placeholder="your-github-username" className="h-9 font-mono text-[10.5px]" aria-label="Owner GitHub account or repo" />
                    <Input value={ownerWorkflow} onChange={(e) => setOwnerWorkflow(e.target.value)} placeholder="android-build.yml" className="h-9 font-mono text-[10.5px]" aria-label="Workflow file" />
                  </div>
                  <Input value={ownerToken} onChange={(e) => setOwnerToken(e.target.value)} type="password" placeholder={platform ? "Token stored · paste a new one to replace" : "github_pat_... (background token, users ko nahi dikhega)"} className="mt-2 h-9 font-mono text-[10.5px]" aria-label="Platform GitHub token" />
                  {ownerMsg && <p className={cn("mt-1.5 text-[9px] leading-relaxed", ownerMsg.ok ? "text-emerald-500" : "text-rose-500")}>{ownerMsg.text}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button
                      variant="lime"
                      size="sm"
                      loading={ownerBusy}
                      onClick={() => {
                        setOwnerMsg(null);
                        const raw = ownerRepo.trim();
                        const slug = parseRepoSlug(raw);
                        const owner = slug?.owner ?? raw.replace(/[^a-zA-Z0-9-]/g, "");
                        const repo = slug?.repo ?? "uapp-builds";
                        if (!owner) { setOwnerMsg({ ok: false, text: "Enter your GitHub username." }); return; }
                        const token = ownerToken.trim() || platform?.token || "";
                        if (!token) { setOwnerMsg({ ok: false, text: "Paste a fine-grained token with repo creation + Actions permissions." }); return; }
                        saveOwnerRunner({ owner, repo, token, workflow: ownerWorkflow.trim() || "android-build.yml", ref: "main" });
                        setOwnerToken("");
                        setOwnerBusy(true);
                        void testPlatformCredential().then((res) => { setOwnerMsg({ ok: res.ok, text: res.message }); setOwnerBusy(false); toast(res.ok ? "Build service connected. Users ko token nahi dikhega." : res.message, res.ok ? "success" : "error"); });
                      }}
                    >Save build service</Button>
                    <Button variant="secondary" size="sm" disabled={!platform || ownerBusy} onClick={() => { setOwnerBusy(true); void testPlatformCredential().then((r) => { setOwnerMsg({ ok: r.ok, text: r.message }); setOwnerBusy(false); }); }}>Test connection</Button>
                    {platform && <Button variant="danger" size="sm" onClick={() => { clearOwnerRunner(); setOwnerRepo(""); setOwnerMsg({ ok: true, text: "Build credential removed from this device." }); toast("Build service disconnected.", "info"); }}>Remove</Button>}
                  </div>
                  <p className="mt-1.5 text-[8px] leading-relaxed text-muted">Token background mein rehta hai (device/deployment secret). Har app ke liye automatic private repo banta hai, code push hota hai, phir APK build dispatch hota hai. Public bundle mein token hardcode kabhi nahi.</p>
                </div>
                <p className="mt-2 text-[8.5px] leading-relaxed text-muted">
                  These variables are read by the build service once, at deployment. They are never shown to users and never
                  collected from users. The included workflow <code className="font-mono text-ink">.github/workflows/android-build.yml</code>{" "}
                  builds a real APK/AAB and uploads it for the download page.
                  {platformSource === "owner-device" ? " A device override is active in this browser." : ""}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><h2 className="text-[12.5px] font-semibold text-ink">Integration status</h2><p className="text-[10px] text-muted">Honest readiness state. Missing credentials are shown, never simulated as working.</p></div>
                  <Badge tone="amber"><TriangleAlert className="h-3 w-3" /> {runtime.filter((r) => r.state !== "configured").length} setup items</Badge>
                </div>
                <div className="mt-3 space-y-1.5">
                  {runtime.map((r) => (
                    <div key={r.key} className="flex items-start gap-2.5 rounded-xl border border-line bg-panel2/30 p-2.5">
                      <div className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg", r.state === "configured" ? "bg-emerald-500/10 text-emerald-500" : r.state === "setup" ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500")}><r.icon className="h-3.5 w-3.5" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5"><span className="text-[10.5px] font-semibold text-ink">{r.label}</span><span className="rounded bg-panel2 px-1 py-0.5 font-mono text-[7px] text-muted">{r.key}</span></div>
                        <div className="mt-0.5 break-all font-mono text-[8.5px] text-ink/60">{r.value}</div>
                        <div className="mt-0.5 text-[8.5px] leading-relaxed text-muted">{r.detail}</div>
                      </div>
                      <Badge tone={r.state === "configured" ? "green" : "amber"} className="shrink-0 px-1.5 py-0.5 text-[7px]">{r.state === "configured" ? "Configured" : "Setup required"}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-[12.5px] font-semibold text-ink">Merchant UPI · payment QR</h2>
                    <p className="text-[10px] text-muted">Owner configures the real merchant UPI once. Plan payments show a scannable UPI QR with the exact amount.</p>
                  </div>
                  <Badge tone={upi ? "green" : "amber"}>{upi ? "QR enabled" : "Not configured"}</Badge>
                </div>
                {upi && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-lime/25 bg-lime/[0.04] px-2.5 py-2">
                    <div><div className="text-[10px] font-semibold text-ink">{upi.payeeName}</div><div className="font-mono text-[9px] text-muted">{upi.upiId}</div></div>
                    <Button variant="danger" size="sm" onClick={() => { clearUpiConfig(); setUpi(null); setUpiMsg({ ok: true, text: "Merchant UPI removed." }); }}>Remove</Button>
                  </div>
                )}
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Input value={upiDraft.upiId} onChange={(e) => setUpiDraft({ ...upiDraft, upiId: e.target.value })} placeholder="business@okhdfcbank" className="h-9 font-mono text-[10.5px]" aria-label="Merchant UPI ID" />
                  <Input value={upiDraft.payeeName} onChange={(e) => setUpiDraft({ ...upiDraft, payeeName: e.target.value })} placeholder="Payee / business name" className="h-9 text-[10.5px]" aria-label="Payee name" />
                </div>
                {upiMsg && <p className={cn("mt-1.5 text-[9px] leading-relaxed", upiMsg.ok ? "text-emerald-500" : "text-rose-500")}>{upiMsg.text}</p>}
                <Button variant="lime" size="sm" className="mt-2" onClick={() => { const res = saveUpiConfig(upiDraft); setUpiMsg({ ok: res.ok, text: res.message }); if (res.ok) { setUpi(getUpiConfig()); toast("UPI QR payments enabled.", "success"); } }}>Save merchant UPI</Button>
                <p className="mt-1.5 text-[8px] leading-relaxed text-muted">Deployment ke liye <span className="font-mono">VITE_UAPP_UPI_ID</span> aur <span className="font-mono">VITE_UAPP_UPI_NAME</span> bhi set kar sakte hain. User apna plan yahin QR se pay karega aur UTR submit karega.</p>
              </Card>

              <Card className="p-4">
                <h2 className="text-[12.5px] font-semibold text-ink">Server environment variables</h2>
                <p className="text-[10px] text-muted">Set these as deployment secrets. Never commit them to source or expose Firebase Admin secrets to the frontend.</p>
                <div className="mt-2 overflow-hidden rounded-lg border border-line bg-[#0a0c10]">
                  <pre className="overflow-auto p-3 font-mono text-[9px] leading-[1.9] text-[#c9d1c2]">{`APP_URL=https://your-domain.example
FIREBASE_PROJECT_ID=dmakenow
FIREBASE_DATABASE_URL=https://dmakenow-default-rtdb.firebaseio.com
FIREBASE_CLIENT_EMAIL=<server secret>
FIREBASE_PRIVATE_KEY=<server secret>
GITHUB_TOKEN=<server secret>
GITHUB_BUILD_REPO=<owner/repo>
GITHUB_WORKFLOW=build-android.yml
OTP_API_BASE=https://otpapi-seven.vercel.app
UPLOAD_DIR=/var/uapp/builds
DOWNLOAD_TTL_SECONDS=540
UPI_MERCHANT_ID=<administrator supplied>
UPI_PAYEE_NAME=<administrator supplied>`}</pre>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone="amber"><Lock className="h-3 w-3" /> Secrets never printed</Badge>
                  <Badge tone="neutral">9-minute TTL</Badge>
                  <Badge tone="neutral">Env example ready</Badge>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-[10px] leading-relaxed text-muted"><span className="font-semibold text-ink">No admin panel exists in this project.</span> Plan changes, payment approval and runtime settings are prepared as secure server-side contracts for a separate future admin application. Normal users can never change their own plan, quota or payment status.</p>
                </div>
              </Card>
            </div>
          )}

          {tab === "account" && (
            <div className="space-y-3">
              <Card className="p-4">
                <h2 className="text-[12.5px] font-semibold text-ink">Export your data</h2>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">Download projects metadata, payments, activity, support records and API key metadata. Passwords and plain OTPs are never included because they are never stored.</p>
                <Button variant="secondary" size="md" className="mt-2.5" onClick={exportData}><Download className="h-4 w-4" /> Export account data (JSON)</Button>
              </Card>
              <Card className="p-4">
                <h2 className="text-[12.5px] font-semibold text-ink">Current usage</h2>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[["Apps", state.apps.length], ["Payments", state.payments.length], ["Support", state.support.length], ["API keys", state.apiKeys.length]].map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-line bg-panel2/40 px-2.5 py-2"><div className="font-display text-[16px] font-bold text-ink">{v}</div><div className="text-[8.5px] text-muted">{k}</div></div>
                  ))}
                </div>
              </Card>
              <Card className="border-rose-500/25 p-4">
                <h2 className="text-[12.5px] font-semibold text-rose-500">Danger zone</h2>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">Reset the workspace clears apps, payments, activity, keys and the local session on this browser. Server data in production requires an authenticated deletion request.</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Button variant="danger" size="sm" onClick={() => setResetOpen(true)}><Trash2 className="h-3.5 w-3.5" /> Reset workspace</Button>
                  <Button variant="secondary" size="sm" onClick={() => { logout(); navigate("/"); }}>Log out</Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset this workspace?" subtitle="Apps, payments, support history and API keys in this device will be removed. This cannot be undone.">
        <Field label="Type RESET to confirm" hint="Device-local data only.">
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="RESET" />
        </Field>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setResetOpen(false)}>Cancel</Button>
          <Button variant="danger" className="flex-1" disabled={confirmText !== "RESET"} onClick={() => { resetWorkspace(); toast("Workspace reset.", "success"); navigate("/"); }}>Reset workspace</Button>
        </div>
      </Modal>
    </div>
  );
}

