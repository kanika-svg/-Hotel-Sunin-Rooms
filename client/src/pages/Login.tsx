import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiUrl, setToken } from "@/lib/apiBase";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bgError, setBgError] = useState(false);
  const [setupMode, setSetupMode] = useState<boolean | null>(null);
  const { login, refreshAuth } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetch(apiUrl("/api/setup/status"))
      .then((r) => r.json())
      .then((data) => setSetupMode(data.canCreateFirstUser === true))
      .catch(() => setSetupMode(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await login(username.trim(), password);
    setSubmitting(false);
    if (result.ok) {
      setLocation("/");
    } else {
      setError(result.error || "Invalid username or password");
    }
  }

  async function handleSetupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/setup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to create account");
        setSubmitting(false);
        return;
      }
      if (data.token) setToken(data.token);
      await refreshAuth();
      setLocation("/");
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] relative overflow-hidden">
      {/* Background image: full frame with slight zoom to fill screen */}
      <div
        className="absolute inset-0 bg-slate-900 overflow-hidden"
        aria-hidden
      >
        {!bgError && (
          <img
            src="/login-bg.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
            style={{ transform: "scale(1.08)" }}
            onError={() => setBgError(true)}
          />
        )}
        {bgError && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-slate-900/55" />
      </div>
      <Card className="w-full max-w-sm relative z-10 bg-white/95 backdrop-blur-sm border-slate-200 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-display font-bold text-slate-900">
            Hotel Sunin Rooms
          </CardTitle>
          <CardDescription className="text-slate-500">
            {setupMode === true
              ? "Create the first account to get started"
              : "Sign in to continue"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {setupMode === true ? (
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="setup-username" className="text-slate-700">
                  Username
                </Label>
                <Input
                  id="setup-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                  placeholder="Choose a username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-password" className="text-slate-700">
                  Password
                </Label>
                <Input
                  id="setup-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                  placeholder="At least 4 characters"
                  required
                  minLength={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-confirm" className="text-slate-700">
                  Confirm password
                </Label>
                <Input
                  id="setup-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                  placeholder="Enter password again"
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating account…" : "Create account"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-700">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                  placeholder="Enter username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                  placeholder="Enter password"
                  required
                />
              </div>
              {error && (
                <div className="text-center space-y-1">
                  <p className="text-sm text-red-600">{error}</p>
                  {error.toLowerCase().includes("network") && (
                    <p className="text-xs text-slate-500">
                      Ensure VITE_API_URL is set in Netlify and you triggered a new deploy after setting it.
                    </p>
                  )}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
