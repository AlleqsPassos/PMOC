import { Fragment } from "react";
import type { PermissionCatalogItem, RoleOption } from "@/features/permissions/queries";
import { categoryLabel } from "@/features/permissions/schema";
import { Check } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Catálogo por papel — read-only, gerenciado por migration/seed, não editável na UI (decisão já tomada na arquitetura). */
export function RolePermissionsMatrix({
  permissions,
  roles,
  rolePermissionKeysByRole,
}: {
  permissions: PermissionCatalogItem[];
  roles: RoleOption[];
  rolePermissionKeysByRole: Record<string, Set<string>>;
}) {
  const categories = [...new Set(permissions.map((p) => p.category))];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Permissão</TableHead>
          {roles.map((r) => (
            <TableHead key={r.id} className="text-center">
              {r.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <Fragment key={category}>
            <TableRow>
              <TableCell colSpan={roles.length + 1} className="bg-muted/50 text-xs font-medium">
                {categoryLabel(category)}
              </TableCell>
            </TableRow>
            {permissions
              .filter((p) => p.category === category)
              .map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{p.label}</TableCell>
                  {roles.map((r) => (
                    <TableCell key={r.id} className="text-center">
                      {rolePermissionKeysByRole[r.id]?.has(p.key) ? (
                        <Check className="text-emerald-600 mx-auto size-4" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}
