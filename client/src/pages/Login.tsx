import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bgError, setBgError] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

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
            Sign in to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
