import { authCredentialsSchema } from "@vetor/contracts";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getLocalStore, isLocalRuntime } from "./runtime";

const SESSION_COOKIE = "vetor_session";

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string) {
  const next = scryptSync(password, salt, 64);
  return timingSafeEqual(Buffer.from(hash, "hex"), next);
}

export async function getSessionUser() {
  if (isLocalRuntime()) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const store = getLocalStore();
    const session = await store.getSession(token);
    if (!session) return null;
    return { id: session.user.id, email: session.user.email };
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
}

export async function signUp(input: unknown) {
  const credentials = authCredentialsSchema.parse(input);
  if (isLocalRuntime()) {
    const store = getLocalStore();
    const { hash, salt } = hashPassword(credentials.password);
    const user = await store.createUser(credentials.email, hash, salt);
    const token = await store.createSession(user.id);
    (await cookies()).set(SESSION_COOKIE, token, cookieOptions());
    return { id: user.id, email: user.email };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? "Não foi possível criar a conta.");
  }
  return { id: data.user.id, email: data.user.email ?? credentials.email };
}

export async function signIn(input: unknown) {
  const credentials = authCredentialsSchema.parse(input);
  if (isLocalRuntime()) {
    const store = getLocalStore();
    const user = await store.findUserByEmail(credentials.email);
    if (!user || !verifyPassword(credentials.password, user.passwordHash, user.salt)) {
      throw new Error("E-mail ou senha inválidos.");
    }
    const token = await store.createSession(user.id);
    (await cookies()).set(SESSION_COOKIE, token, cookieOptions());
    return { id: user.id, email: user.email };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
  if (error || !data.user) {
    throw new Error("E-mail ou senha inválidos.");
  }
  return { id: data.user.id, email: data.user.email ?? credentials.email };
}

export async function signOut() {
  if (isLocalRuntime()) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) await getLocalStore().deleteSession(token);
    (await cookies()).delete(SESSION_COOKIE);
    return;
  }
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

export async function requestRecovery(email: string) {
  if (isLocalRuntime()) {
    return {
      message: "No modo local, recupere o acesso criando outra conta ou apagando .data/.",
    };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`,
  });
  if (error) throw new Error(error.message);
  return { message: "Se o e-mail existir, enviaremos as instruções de recuperação." };
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        },
      },
    },
  );
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  };
}
