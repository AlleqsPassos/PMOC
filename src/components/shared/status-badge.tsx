import { Badge } from "@/components/ui/badge";

/** Badge padrão para o status active/inactive comum a clients/units. */
export function StatusBadge({ status }: { status: "active" | "inactive" }) {
  return (
    <Badge variant={status === "active" ? "default" : "secondary"}>
      {status === "active" ? "Ativo" : "Inativo"}
    </Badge>
  );
}
