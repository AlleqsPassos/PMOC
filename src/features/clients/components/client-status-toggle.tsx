"use client";

import { Button } from "@/components/ui/button";
import { setClientStatus } from "@/features/clients/actions";

export function ClientStatusToggle({
  clientId,
  status,
}: {
  clientId: string;
  status: "active" | "inactive";
}) {
  const nextStatus = status === "active" ? "inactive" : "active";

  return (
    <form action={setClientStatus.bind(null, clientId, nextStatus)}>
      <Button type="submit" variant="outline" size="sm">
        {status === "active" ? "Inativar" : "Reativar"}
      </Button>
    </form>
  );
}
