"use client";

import { useActionState } from "react";
import { loginAction } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, { error: null as string | null });

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="email@empresa.pt" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state?.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
      <Button className="w-full" disabled={pending}>
        {pending ? "A entrar..." : "Entrar"}
      </Button>
    </form>
  );
}
