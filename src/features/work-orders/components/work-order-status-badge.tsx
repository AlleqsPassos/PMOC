import { Badge } from "@/components/ui/badge";
import { WORK_ORDER_STATUS_LABELS, type WorkOrderStatus } from "@/features/work-orders/schema";

const VARIANT: Record<WorkOrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  aberta: "outline",
  em_andamento: "default",
  concluida: "secondary",
  cancelada: "destructive",
};

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  return <Badge variant={VARIANT[status]}>{WORK_ORDER_STATUS_LABELS[status]}</Badge>;
}
