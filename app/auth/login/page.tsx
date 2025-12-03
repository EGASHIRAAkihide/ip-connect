"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction } from "../actions";

const initialState = { error: null as string | null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-neutral-900 px-4 py-2 font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Log in"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <section className="mx-auto mt-10 max-w-lg rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-neutral-900">Log in</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Use the same email/password you registered with.
      </p>
      <form action={formAction} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-neutral-800">
          Email
          <input
            type="email"
            name="email"
            required
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
          />
        </label>
        <label className="block text-sm font-medium text-neutral-800">
          Password
          <input
            type="password"
            name="password"
            required
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
          />
        </label>
        <SubmitButton />
      </form>
      {state.error && (
        <p className="mt-4 text-sm text-neutral-700" role="status">
          {state.error}
        </p>
      )}
      <p className="mt-6 text-sm text-neutral-600">
        Need an account?{" "}
        <Link href="/auth/register" className="text-neutral-900 underline">
          Sign up
        </Link>
      </p>
    </section>
  );
}
