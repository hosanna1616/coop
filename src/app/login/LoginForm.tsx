"use client";

import { useState } from "react";
import { ArrowRight, Mail, Lock, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/app/actions/auth";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setPending(true);
    try {
      const result = await login(email, password);
      if (result?.error) {
        setError(result.error);
        setPending(false);
        return;
      }
      if (result?.ok && result.redirectTo) {
        router.push(result.redirectTo);
        return;
      }
      setPending(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div
          className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-5">
        <div className="grid gap-2">
          <Label
            htmlFor="email"
            className="font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground"
          >
            Email
          </Label>
          <div className="group relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" aria-hidden />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@bank.coop"
              required
              disabled={pending}
              className="h-12 rounded-xl border-border/80 bg-muted/30 pl-10 font-mono text-foreground placeholder:text-muted-foreground transition-colors focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label
            htmlFor="password"
            className="font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground"
          >
            Password
          </Label>
          <div className="group relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" aria-hidden />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={pending}
              placeholder="••••••••"
              className="h-12 rounded-xl border-border/80 bg-muted/30 pl-10 font-mono text-foreground placeholder:text-muted-foreground transition-colors focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="group/btn h-12 w-full rounded-xl font-mono font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30"
      >
        {pending ? (
          <span className="flex items-center gap-2">
            <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" aria-hidden />
            Signing in…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            Sign in
            <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" aria-hidden />
          </span>
        )}
      </Button>
    </form>
  );
}
