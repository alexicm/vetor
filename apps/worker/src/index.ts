import { createClient } from "@supabase/supabase-js";
import {
  LocalStore,
  SupabaseStore,
  processJob,
  type JobRuntime,
} from "@vetor/core";
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(process.cwd(), "../../.env.local") });
config({ path: path.resolve(process.cwd(), "../../.env") });

function createRuntime(): JobRuntime {
  const runtime = process.env.VETOR_RUNTIME;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (runtime === "supabase" || (supabaseUrl && serviceKey && runtime !== "local")) {
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Runtime supabase exige SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
    }
    return new SupabaseStore({
      client: createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    });
  }

  return new LocalStore(path.resolve(process.cwd(), "../../", process.env.VETOR_DATA_DIR ?? ".data"));
}

async function main() {
  const store = createRuntime();
  if (store instanceof LocalStore) {
    await store.ensure();
  }

  console.info(
    JSON.stringify({
      level: "info",
      message: "worker_started",
      runtime: store instanceof LocalStore ? "local" : "supabase",
    }),
  );

  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  while (!stopping) {
    try {
      const message = await store.dequeue();
      if (!message) {
        await wait(1000);
        continue;
      }
      await processJob(store, message.jobId);
      await store.ack(message.messageId);
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "worker_loop_error",
          error: error instanceof Error ? error.message : "unknown",
        }),
      );
      await wait(2000);
    }
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
