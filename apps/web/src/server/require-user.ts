import { getSessionUser } from "./auth";

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthRequiredError();
  }
  return user;
}

export class AuthRequiredError extends Error {
  constructor() {
    super("Faça login para continuar.");
    this.name = "AuthRequiredError";
  }
}
