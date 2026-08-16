import "server-only";
import { createClient } from "@/lib/supabase/server";

export type PendingInvite = {
  id: string;
  fullName: string | null;
  email: string | null;
  code: string;
  createdAt: string;
  expiresAt: string;
};

export async function listPendingInvites(): Promise<PendingInvite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invites")
    .select("id, full_name, email, code, created_at, expires_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listPendingInvites]", error.message);
    return [];
  }

  return (data ?? []).map((i) => ({
    id: i.id,
    fullName: i.full_name,
    email: i.email,
    code: i.code,
    createdAt: i.created_at,
    expiresAt: i.expires_at,
  }));
}
