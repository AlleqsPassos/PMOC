"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AUDIT_ENTITY_TYPES, ENTITY_TYPE_LABELS } from "@/features/audit/schema";

const ALL = "all";

/** Mesmo padrão de src/features/tickets/components/ticket-filters.tsx — filtros vivem na URL, sem estado local. */
export function AuditLogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const entityType = searchParams.get("entityType") ?? ALL;
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={entityType} onValueChange={(v) => setParam("entityType", v)}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Todas as entidades" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as entidades</SelectItem>
          {AUDIT_ENTITY_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {ENTITY_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        aria-label="Data inicial"
        className="w-[160px]"
        value={dateFrom}
        onChange={(e) => setParam("dateFrom", e.target.value)}
      />
      <span className="text-muted-foreground text-sm">até</span>
      <Input
        type="date"
        aria-label="Data final"
        className="w-[160px]"
        value={dateTo}
        onChange={(e) => setParam("dateTo", e.target.value)}
      />
    </div>
  );
}
