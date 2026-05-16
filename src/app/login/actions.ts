"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Validate that a post-auth redirect target stays on this origin.
 *  Accepts only paths starting with "/" and not "//" (which would be
 *  protocol-relative). Falls back to /projects on any failure.
 */
function safeNext(value: string): string {
  if (!value.startsWith("/")) return "/projects";
  if (value.startsWith("//")) return "/projects";
  return value;
}

export async function signInWithMagicLink(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? "/projects"));

  if (!email) {
    redirect(
      `/login?error=${encodeURIComponent("Ingresa un correo válido.")}`,
    );
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin =
    headersList.get("origin") ??
    `${headersList.get("x-forwarded-proto") ?? "http"}://${headersList.get("host")}`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?sent=1");
}

export async function signInWithPassword(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/projects"));

  if (!email || !password) {
    redirect(
      `/login?error=${encodeURIComponent("Ingresa correo y contraseña.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
