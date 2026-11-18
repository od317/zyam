"use client";

import { useActionState } from "react";
import { passwordAction, otpAction, type FormState } from "./actions";

const initial: FormState = {};
const input =
  "w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:border-amber-500 focus:outline-none";
const button =
  "w-full rounded bg-amber-600 px-3 py-2 font-semibold text-stone-950 disabled:opacity-50";

export function PasswordForm({ lang }: { lang: string }) {
  const [state, action, pending] = useActionState(passwordAction, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lang" value={lang} />
      <input
        name="email"
        type="email"
        required
        autoComplete="username"
        placeholder="Email"
        className={input}
      />
      <input
        name="password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="Password"
        className={input}
      />
      {state.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}
      <button disabled={pending} className={button}>
        {pending ? "..." : "Continue"}
      </button>
    </form>
  );
}

export function OtpForm({ lang }: { lang: string }) {
  const [state, action, pending] = useActionState(otpAction, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lang" value={lang} />
      <input
        name="code"
        required
        autoComplete="one-time-code"
        inputMode="text"
        placeholder="6-digit code or backup code"
        className={input}
      />
      {state.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}
      <button disabled={pending} className={button}>
        {pending ? "..." : "Sign in"}
      </button>
    </form>
  );
}
