"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EQUIPMENT_STATUS, EQUIPMENT_STATUS_LABELS } from "@/features/equipment/schema";
import type { ClientOption } from "@/features/clients/queries";
import type { UnitOption } from "@/features/units/queries";

const ALL = "all";

export function EquipmentFilters({
  clientOptions,
  unitOptions,
}: {
  clientOptions: ClientOption[];
  unitOptions: UnitOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const clientId = searchParams.get("clientId") ?? ALL;
  const unitId = searchParams.get("unitId") ?? ALL;
  const status = searchParams.get("status") ?? ALL;

  function setParam(key: "clientId" | "unitId" | "status", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    if (key === "clientId") params.delete("unitId");
    router.push(`${pathname}?${params.toString()}`);
  }

  const unitsForClient =
    clientId === ALL ? unitOptions : unitOptions.filter((u) => u.clientId === clientId);

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={clientId} onValueChange={(v) => setParam("clientId", v)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Todos os clientes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os clientes</SelectItem>
          {clientOptions.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.corporateName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={unitId} onValueChange={(v) => setParam("unitId", v)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Todas as unidades" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as unidades</SelectItem>
          {unitsForClient.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(v) => setParam("status", v)}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Todos os status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os status</SelectItem>
          {EQUIPMENT_STATUS.map((s) => (
            <SelectItem key={s} value={s}>
              {EQUIPMENT_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
