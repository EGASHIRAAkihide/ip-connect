import { createServerClient } from "@/lib/supabase/server";

export async function getServerUser() {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    return null;
  }

  return data.user;
}

export async function getServerUserWithRole() {
  const supabase = await createServerClient();
  const user = await getServerUser();

  if (!user) {
    return { user: null, role: null as string | null };
  }

  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[getServerUserWithRole] role fetch error:", error);
  }

  return { user, role: data?.role ?? null };
}
