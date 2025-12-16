"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerActionClient } from "@/lib/supabase/server";

type NextRole = "creator" | "company";

const ALLOW_SWITCH = process.env.ALLOW_ADMIN_ROLE_SWITCH === "true";

export async function switchRole(nextRole: NextRole) {
  if (!ALLOW_SWITCH) {
    throw new Error("ロール切替は無効化されています。");
  }

  if (nextRole !== "creator" && nextRole !== "company") {
    throw new Error("無効なロールです。");
  }

  const supabase = await createServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証されていません。");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, role, is_admin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("ユーザー情報が取得できません。");
  }

  if (!profile.is_admin) {
    throw new Error("権限がありません。");
  }

  const { error } = await supabase
    .from("users")
    .update({ role: nextRole })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin/dev");
  redirect("/admin/dev");
}
