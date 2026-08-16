"use client";

import { Button } from "@/components/ui/button";
import { setPreventivePlanStatus } from "@/features/preventive-plans/actions";

export function PreventivePlanStatusToggle({
  planId,
  status,
}: {
  planId: string;
  status: "active" | "inactive";
}) {
  const nextStatus = status === "active" ? "inactive" : "active";

  return (
    <form action={setPreventivePlanStatus.bind(null, planId, nextStatus)}>
      <Button type="submit" variant="outline" size="sm">
        {status === "active" ? "Inativar" : "Reativar"}
      </Button>
    </form>
  );
}
