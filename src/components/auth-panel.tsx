"use client";

import { useState } from "react";
import { CheckIcon, LoaderIcon, MailIcon } from "lucide-react";

import { useProgress } from "@/lib/progress/store";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function AuthPanel() {
  const { user, supabaseEnabled, syncing } = useProgress();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  if (!supabaseEnabled) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="space-y-2 text-sm">
          <p className="font-medium">Sync is not configured on this deployment.</p>
          <p className="text-muted-foreground leading-6">
            Progress is being saved in this browser only. To sync it between
            your laptop and your phone, create a free Supabase project, run{" "}
            <code className="bg-muted rounded px-1 font-mono text-xs">
              supabase/migrations/0001_init.sql
            </code>{" "}
            in its SQL editor, then set{" "}
            <code className="bg-muted rounded px-1 font-mono text-xs">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            and{" "}
            <code className="bg-muted rounded px-1 font-mono text-xs">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            in your Vercel project settings. Full walkthrough is in{" "}
            <code className="bg-muted rounded px-1 font-mono text-xs">
              DEPLOY.md
            </code>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  if (user) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          <CheckIcon className="size-4 text-emerald-500" />
          <span>
            Signed in as <strong>{user.email}</strong>
            {syncing && (
              <span className="text-muted-foreground ml-2 inline-flex items-center gap-1">
                <LoaderIcon className="size-3 animate-spin" /> syncing…
              </span>
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => void getSupabaseClient()?.auth.signOut()}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sendLink = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setState("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else {
      setState("sent");
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Sign in with a magic link — no password to remember. Your progress on
          this browser is merged into your account, not replaced.
        </p>

        {state === "sent" ? (
          <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600">
            <MailIcon className="size-4" /> Check {email} for the sign-in link.
          </p>
        ) : (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void sendLink();
            }}
          >
            <div className="flex-1 space-y-1">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button type="submit" disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Send link"}
            </Button>
          </form>
        )}

        {state === "error" && (
          <p className="text-destructive text-sm">{message}</p>
        )}
      </CardContent>
    </Card>
  );
}
