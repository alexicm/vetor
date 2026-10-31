import { createClient } from "@supabase/supabase-js";
import { LocalStore, SupabaseStore, type JobRuntime } from "@vetor/core";
import path from "node:path";

export function dataDir() {
  return path.resolve(process.cwd(), "../../", process.env.VETOR_DATA_DIR ?? ".data");
}

export function isLocalRuntime() {
  if (process.env.VETOR_RUNTIME === "local") return true;
  if (process.env.VETOR_RUNTIME === "supabase") return false;
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getLocalStore() {
  return new LocalStore(dataDir());
}

export function getServiceRuntime(): JobRuntime {
  if (isLocalRuntime()) {
    return getLocalStore();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Credenciais do Supabase ausentes.");
  }

  return new SupabaseStore({
    client: createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  });
}
