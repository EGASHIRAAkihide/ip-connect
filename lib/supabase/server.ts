import { cookies } from "next/headers";
import {
  createServerClient as createSupabaseServerClient,
  type CookieOptions,
} from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

/**
 * Server Component / page.tsx 用（cookie は読むだけ）
 */
export async function createServerClient() {
  const cookieStore = await cookies(); // ← await

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(_name: string, _value: string, _options: CookieOptions) {
        // no-op
      },
      remove(_name: string, _options: CookieOptions) {
        // no-op
      },
    },
  });
}

/**
 * Server Action / Route Handler 用（cookie 書き換え可）
 */
export async function createServerActionClient() {
  const cookieStore = await cookies(); // ← await

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });
}
