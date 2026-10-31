import { handleRouteError, jsonOk, rateLimit } from "@/server/http";
import { signUp } from "@/server/auth";

export async function POST(request: Request) {
  try {
    rateLimit(`signup:${request.headers.get("x-forwarded-for") ?? "local"}`, 8);
    const body = await request.json();
    const user = await signUp(body);
    return jsonOk(user, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
