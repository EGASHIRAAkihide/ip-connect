// lib/supabase/server.ts
import { cookies } from "next/headers";
import {
  createServerClient as createSupabaseServerClient,
  type CookieOptions,
} from "@supabase/ssr";

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      /** 読み取り: cookies() が Promise なので毎回 await する */
      async get(name: string) {
        const store = await cookies();
        return store.get(name)?.value;
      },
      /** 設定 */
      async set(name: string, value: string, options: CookieOptions) {
        const store = await cookies();
        store.set({
          name,
          value,
          ...options,
        });
      },
      /** 削除 */
      async remove(name: string, options: CookieOptions) {
        const store = await cookies();
        store.set({
          name,
          value: "",
          ...options,
          maxAge: 0,
        });
      },
    },
  });
}