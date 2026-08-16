"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CompanyUser } from "@/features/users/queries";

/** Mesmo padrão de URL-driven filter das demais listagens (ver ticket-filters.tsx). */
export function UserSelect({ users, selectedUserId }: { users: CompanyUser[]; selectedUserId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(userId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("userId", userId);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={selectedUserId} onValueChange={handleChange}>
      <SelectTrigger className="w-[260px]">
        <SelectValue placeholder="Selecione um usuário" />
      </SelectTrigger>
      <SelectContent>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
