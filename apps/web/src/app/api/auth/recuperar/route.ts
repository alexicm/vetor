import { recoverSchema } from "@vetor/contracts";
import { requestRecovery } from "@/server/auth";
import { handleRouteError, jsonOk, rateLimit } from "@/server/http";

export async function POST(request: Request) {
  try {
    rateLimit(`recover:${request.headers.get("x-forwarded-for") ?? "local"}`, 6);
    const body = recoverSchema.parse(await request.json());
    const result = await requestRecovery(body.email);
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
