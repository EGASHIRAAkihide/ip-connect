import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/types";

export const isLabEnabled = () => process.env.ENABLE_LAB === "true";

type SupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

type AdminProfile = UserProfile & { is_admin: boolean };

export async function requireLabAdmin(): Promise<{
  supabase: SupabaseClient;
  user: AdminProfile;
}> {
  if (!isLabEnabled()) {
    return notFound();
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, is_admin, role")
    .eq("id", user.id)
    .maybeSingle<AdminProfile>();

  if (!profile?.is_admin) {
    return notFound();
  }

  return { supabase, user: { ...profile, is_admin: true } };
}
