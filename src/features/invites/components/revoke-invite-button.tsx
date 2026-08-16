"use client";

import { Button } from "@/components/ui/button";
import { revokeInvite } from "@/features/invites/actions";

export function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  return (
    <form action={revokeInvite.bind(null, inviteId)}>
      <Button type="submit" variant="ghost" size="sm">
        Revogar
      </Button>
    </form>
  );
}
