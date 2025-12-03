"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        throw new Error(error?.message ?? "Invalid credentials");
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single<UserProfile>();

      if (profileError || !profile) {
        throw new Error("Profile not found. Please register again.");
      }

      setMessage("Logged in. Redirecting…");
      router.push(profile.role === "creator" ? "/creator/dashboard" : "/ip");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mx-auto mt-10 max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow">
      <h1 className="text-2xl font-semibold text-white">Log in</h1>
      <p className="mt-2 text-sm text-slate-400">
        Use the same email/password you registered with.
      </p>
      <form onSubmit={handleLogin} className="mt-6 space-y-4">
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
            required
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-white"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-emerald-500 px-4 py-2 font-semibold text-black disabled:opacity-50"
        >
          {isLoading ? "Signing in…" : "Log in"}
        </button>
      </form>
      {message && (
        <p className="mt-4 text-sm text-amber-300" role="status">
          {message}
        </p>
      )}
      <p className="mt-6 text-sm text-slate-400">
        Need an account?{" "}
        <Link href="/auth/register" className="text-emerald-300 underline">
          Sign up
        </Link>
      </p>
    </section>
  );
}
