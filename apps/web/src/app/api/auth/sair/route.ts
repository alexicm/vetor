import { handleRouteError, jsonOk } from "@/server/http";
import { signOut } from "@/server/auth";

export async function POST() {
  try {
    await signOut();
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
