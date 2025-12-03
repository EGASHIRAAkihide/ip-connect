"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("creator");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error || !data.user) {
        throw new Error(error?.message ?? "Unknown error");
      }

      const profilePayload = {
        id: data.user.id,
        email: data.user.email,
        role,
      };

      const { error: profileError } = await supabase
        .from("users")
        .insert(profilePayload);

      if (profileError) {
        throw new Error(profileError.message);
      }

      setMessage("Account created, redirecting…");
      router.push(role === "creator" ? "/creator/dashboard" : "/ip");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mx-auto mt-10 max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow">
      <h1 className="text-2xl font-semibold text-white">Create an account</h1>
      <p className="mt-2 text-sm text-slate-400">
        Choose a role to follow the PoC test checklist.
      </p>
      <form onSubmit={handleRegister} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-200">
          Email
          <input
            type="email"
            required
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-white"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          Password
          <input
            type="password"
            minLength={6}
            required
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-white"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          Role
          <select
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-white"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            <option value="creator">Creator</option>
            <option value="company">Company</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-emerald-500 px-4 py-2 font-semibold text-black disabled:opacity-50"
        >
          {isLoading ? "Creating account…" : "Sign up"}
        </button>
      </form>
      {message && (
        <p className="mt-4 text-sm text-amber-300" role="status">
          {message}
        </p>
      )}
      <p className="mt-6 text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-emerald-300 underline">
          Log in
        </Link>
      </p>
    </section>
  );
}
