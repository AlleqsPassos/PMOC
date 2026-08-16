import { Badge } from "@/components/ui/badge";
import { EQUIPMENT_STATUS_LABELS, type EquipmentStatus } from "@/features/equipment/schema";

const VARIANT: Record<EquipmentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  operacional: "default",
  atencao: "outline",
  em_manutencao: "secondary",
  inativo: "destructive",
};

/** Versão somente leitura de EquipmentStatusSelect — para quem não tem edit_equipment. */
export function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
  return <Badge variant={VARIANT[status]}>{EQUIPMENT_STATUS_LABELS[status]}</Badge>;
}
