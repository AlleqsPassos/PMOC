import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PartsRequestStatus } from "@/features/parts-requests/schema";

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export type PartsRequestItem = {
  id: string;
  partName: string;
  quantity: number;
  note: string | null;
  status: PartsRequestStatus;
  requestedByName: string;
  createdAt: string;
};

export async function listPartsRequestsByWorkOrder(
  workOrderId: string,
): Promise<PartsRequestItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parts_requests")
    .select(
      "id, part_name, quantity, note, status, created_at, requested_by:users!parts_requests_requested_by_user_id_fkey(full_name)",
    )
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listPartsRequestsByWorkOrder]", error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    partName: r.part_name,
    quantity: r.quantity,
    note: r.note,
    status: r.status,
    requestedByName: firstOf(r.requested_by)?.full_name ?? "—",
    createdAt: r.created_at,
  }));
}
