"use server";

import { redirect } from "next/navigation";
import { createServerActionClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export async function loginAction(
  prevState: { error: string | null },
  formData: FormData,
) {
  const email = formData.get("email") as string | null;
  const password = formData.get("password") as string | null;

  if (!email || !password) {
    return { error: "メールアドレスとパスワードは必須です。" };
  }

  const supabase = await createServerActionClient(); // ← await を追加
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message ?? "メールアドレスまたはパスワードが正しくありません。" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile?.role) {
    return { error: "プロフィール情報が見つかりません。再度登録してください。" };
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
    return { error: "メールアドレスとパスワードは必須です。" };
  }

  const supabase = await createServerActionClient(); // ← ここも serverActionClient
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message ?? "アカウント作成に失敗しました。" };
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
