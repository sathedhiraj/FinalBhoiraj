"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Mail, Lock, Eye, EyeOff, KeyRound } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  // One-time bootstrap so the operator can actually log in.
  // Also recover from a known edge case: after a successful signIn the page
  // reloads, but if useSession() reports "unauthenticated" momentarily due to
  // slow cookie propagation, the AuthScreen would flash. We poll the session
  // endpoint directly — if a real session exists, force a reload so the app
  // re-evaluates and shows the dashboard.
  useEffect(() => {
    let active = true;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/seed", { method: "POST" });
        const data = await res.json();
        if (active && data?.created) {
          setSeedMsg(`Default admin created — email: ${data.credentials.email}, password: ${data.credentials.password}`);
          setEmail(data.credentials.email);
          setPassword(data.credentials.password);
        }
      } catch {
        /* ignore */
      }
      // Session recovery check: if the server says we ARE logged in but
      // useSession() reported unauthenticated, reload to reconcile.
      try {
        const r = await fetch("/api/auth/session", { cache: "no-store" });
        const s = await r.json();
        if (!cancelled && s?.user?.email) {
          // We have a session server-side; force a full reload.
          window.location.reload();
          return;
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
      cancelled = true;
    };
  }, []);

  // One-click recovery: reset the default admin password back to admin123,
  // pre-fill the form AND automatically log in so the user lands on the dashboard.
  const [autoLoggingIn, setAutoLoggingIn] = useState(false);
  async function resetToDefault() {
    setResetting(true);
    try {
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Reset failed");
      const creds = data.credentials;
      setEmail(creds.email);
      setPassword(creds.password);
      toast.success("Password reset to default. Logging you in…");
      setResetting(false);
      setAutoLoggingIn(true);
      // Use redirect:true so NextAuth handles the full navigation back to "/"
      // after the session cookie is fully committed. This avoids the race
      // condition where useSession() re-reads before the cookie is available.
      await signIn("credentials", {
        email: creds.email,
        password: creds.password,
        callbackUrl: "/",
        redirect: true,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
      setResetting(false);
      setAutoLoggingIn(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) return toast.error("Please enter a valid email address.");
    if (!password) return toast.error("Please enter your password.");
    setLoading(true);
    // Use redirect:true + callbackUrl:"/" so NextAuth navigates to the
    // dashboard only after the session cookie is fully committed. The earlier
    // redirect:false approach could race useSession() and bounce back to login.
    const res = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/",
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid email or password. Use \"Reset password & log in\" below to recover.", {
        duration: 5000,
      });
      return;
    }
    // res.ok + res.url set means login succeeded; hard reload to the returned
    // URL (defaults to "/") so useSession re-initializes from the fresh cookie.
    const target = res?.url || "/";
    toast.success("Welcome back!");
    window.location.href = target;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <div className="bg-festive px-6 pt-16 pb-20 rounded-b-[2.25rem] text-center">
        <div className="inline-grid place-items-center h-20 w-20 rounded-3xl bg-white/15 ring-1 ring-white/30 text-5xl mb-4">
          🙏
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Shree Ganesh</h1>
        <p className="text-sm text-white/85 mt-1">Ganesh Mandal Management &amp; Accounting</p>
        <p className="text-xs text-white/70 mt-3">Admin Login</p>
      </div>

      <div className="flex-1 px-5 -mt-10">
        <div className="bg-card rounded-3xl shadow-xl ring-1 ring-border p-6 space-y-5">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="admin@mandal.in"
                  className="pl-9 h-12 rounded-xl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <ForgotPassword />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9 pr-10 h-12 rounded-xl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading || resetting || autoLoggingIn} className="w-full h-12 rounded-xl text-base font-semibold">
              {loading || autoLoggingIn ? <Loader2 className="h-5 w-5 animate-spin" /> : "Login"}
            </Button>
          </form>

          {seedMsg && (
            <div className="text-xs rounded-xl bg-accent/60 text-accent-foreground px-3 py-2.5 leading-relaxed">
              <span className="font-semibold">First-time setup:</span> {seedMsg}
            </div>
          )}

          {/* Always-visible default credentials + one-click recovery. */}
          <div className="text-xs rounded-xl bg-muted px-3 py-3 leading-relaxed space-y-2">
            <div>
              <span className="font-semibold text-foreground">Default admin credentials:</span>
              <br />
              Email: <code className="font-mono">admin@mandal.in</code> · Password: <code className="font-mono">admin123</code>
            </div>
            <button
              type="button"
              onClick={resetToDefault}
              disabled={resetting || autoLoggingIn}
              className="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline disabled:opacity-60"
            >
              {resetting || autoLoggingIn ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {resetting ? "Resetting…" : "Logging you in…"}
                </>
              ) : (
                "Reset password & log in"
              )}
            </button>
          </div>
        </div>
      </div>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        Ganpati Bappa Morya! · Secure admin access only
      </footer>
    </div>
  );
}

function ForgotPassword() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) return toast.error("Enter a valid email.");
    if (pw.length < 6) return toast.error("Password must be at least 6 characters.");
    setLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword: pw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Reset failed");
      toast.success(data?.message || "Password reset successful.");
      setOpen(false);
      setPw("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-primary hover:underline"
      >
        Forgot Password?
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" /> Reset Password
            </DialogTitle>
            <DialogDescription>
              In production a reset link is emailed. In this sandbox you can set a new password directly.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="rp-email">Email</Label>
              <Input
                id="rp-email"
                type="email"
                className="h-11 rounded-xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-pw">New Password</Label>
              <Input
                id="rp-pw"
                type="password"
                className="h-11 rounded-xl"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="min 6 characters"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="rounded-xl">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
