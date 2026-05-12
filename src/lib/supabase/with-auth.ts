import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

type Authenticated = { supabase: SupabaseClient; user: User };
type AuthResult = { authenticated: true; value: Authenticated } | { authenticated: false; response: NextResponse };

export async function requireUser(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: "Unauthorized", detail: error?.message },
        { status: 401 },
      ),
    };
  }
  return { authenticated: true, value: { supabase, user } };
}
