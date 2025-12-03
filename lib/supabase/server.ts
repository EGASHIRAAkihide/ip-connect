// lib/supabase/server.ts
import { createClient } from "@supabase/supabase-js";

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function getServerUser() {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("[getServerUser] error:", error);
  }

  return data?.user ?? null;
}

export async function getServerSession() {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("[getServerSession] error:", error);
  }

  return data?.session ?? null;
}