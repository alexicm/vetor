import { handleRouteError, jsonOk, rateLimit } from "@/server/http";
import { signIn } from "@/server/auth";

export async function POST(request: Request) {
  try {
    rateLimit(`login:${request.headers.get("x-forwarded-for") ?? "local"}`, 12);
    const body = await request.json();
    const user = await signIn(body);
    return jsonOk(user);
  } catch (error) {
    return handleRouteError(error);
  }
}
