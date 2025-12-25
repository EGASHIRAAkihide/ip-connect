"use server";

import { redirect } from "next/navigation";
import { createServerActionClient } from "@/lib/supabase/server";

export async function logoutAction() {
  const supabase = await createServerActionClient();
  await supabase.auth.signOut();
  redirect("/");
}
