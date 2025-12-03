"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export async function loginAction(
  prevState: { error: string | null },
  formData: FormData,
) {
  const email = formData.get("email") as string | null;
  const password = formData.get("password") as string | null;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = createServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Invalid credentials." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile?.role) {
    return { error: "Profile not found. Please register again." };
  }

  redirect(profile.role === "creator" ? "/creator/dashboard" : "/ip");
}

export async function registerAction(
  prevState: { error: string | null },
  formData: FormData,
) {
  const email = formData.get("email") as string | null;
  const password = formData.get("password") as string | null;
  const role = (formData.get("role") as Role | null) ?? "creator";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = createServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Failed to create account." };
  }

  const { error: profileError } = await supabase.from("users").insert({
    id: data.user.id,
    email: data.user.email,
    role,
  });

  if (profileError) {
    return { error: profileError.message };
  }

  redirect(role === "creator" ? "/creator/dashboard" : "/ip");
}
