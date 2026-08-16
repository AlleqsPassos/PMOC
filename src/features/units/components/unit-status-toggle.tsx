"use client";

import { Button } from "@/components/ui/button";
import { setUnitStatus } from "@/features/units/actions";

export function UnitStatusToggle({
  unitId,
  status,
}: {
  unitId: string;
  status: "active" | "inactive";
}) {
  const nextStatus = status === "active" ? "inactive" : "active";

  return (
    <form action={setUnitStatus.bind(null, unitId, nextStatus)}>
      <Button type="submit" variant="outline" size="sm">
        {status === "active" ? "Inativar" : "Reativar"}
      </Button>
    </form>
  );
}
