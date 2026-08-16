import { Badge } from "@/components/ui/badge";
import { PMOC_STATUS_LABELS } from "@/features/pmoc/schema";
import type { PmocStatus } from "@/features/pmoc/queries";

const VARIANT: Record<PmocStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  generated: "secondary",
};

export function PmocStatusBadge({ status }: { status: PmocStatus }) {
  return <Badge variant={VARIANT[status]}>{PMOC_STATUS_LABELS[status]}</Badge>;
}
