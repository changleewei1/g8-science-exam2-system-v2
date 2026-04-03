import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

let _admin: SupabaseClient | null = null;

/**
 * Lazy Supabase client（service role），供 API / Server Actions 使用。
 * 勿於 client component 匯入。
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error(
      "系統設定未完成：請設定 NEXT_PUBLIC_SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY（僅限伺服器端，勿公開於前端）。",
    );
  }
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}
