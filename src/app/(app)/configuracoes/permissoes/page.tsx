import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import {
  listPermissionsCatalog,
  listRoles,
  getRolePermissionKeysByRole,
  getUserPermissionOverrides,
} from "@/features/permissions/queries";
import { listCompanyUsers } from "@/features/users/queries";
import { categoryLabel, type OverrideMode } from "@/features/permissions/schema";
import { RolePermissionsMatrix } from "@/features/permissions/components/role-permissions-matrix";
import { UserSelect } from "@/features/permissions/components/user-select";
import { PermissionOverrideRow } from "@/features/permissions/components/permission-override-row";
import { AccessDenied } from "@/components/shared/access-denied";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Permissões — PMOC+" };

export default async function PermissoesPage(props: PageProps<"/configuracoes/permissoes">) {
  const searchParams = await props.searchParams;
  await requireUser();

  const canManage = await hasPermission("manage_permissions");
  if (!canManage) {
    return <AccessDenied message="Você não tem permissão para gerenciar permissões." />;
  }

  const [permissions, roles, rolePermissionKeysByRole, users] = await Promise.all([
    listPermissionsCatalog(),
    listRoles(),
    getRolePermissionKeysByRole(),
    listCompanyUsers(),
  ]);

  const userIdParam = typeof searchParams.userId === "string" ? searchParams.userId : undefined;
  const selectedUser = users.find((u) => u.id === userIdParam) ?? users[0];
  const selectedRole = roles.find((r) => r.key === selectedUser?.roleKey);
  const roleDefaults = selectedRole ? (rolePermissionKeysByRole[selectedRole.id] ?? new Set<string>()) : new Set<string>();
  const overrides = selectedUser ? await getUserPermissionOverrides(selectedUser.id) : {};

  const categories = [...new Set(permissions.map((p) => p.category))];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Permissões</h1>
        <p className="text-muted-foreground text-sm">
          Catálogo por papel e overrides individuais por usuário.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo por papel</CardTitle>
          <CardDescription>
            Gerenciado pelo sistema — não editável aqui. Overrides por usuário abaixo têm
            precedência sobre isto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RolePermissionsMatrix
            permissions={permissions}
            roles={roles}
            rolePermissionKeysByRole={rolePermissionKeysByRole}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overrides por usuário</CardTitle>
          <CardDescription>
            Permite ou nega uma permissão específica pra um usuário, sobrepondo o padrão do
            papel dele. &ldquo;Padrão do papel&rdquo; remove o override e volta ao catálogo acima.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {users.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum usuário cadastrado ainda.</p>
          ) : selectedUser ? (
            <>
              <UserSelect users={users} selectedUserId={selectedUser.id} />
              <div className="flex flex-col divide-y">
                {categories.map((category) => (
                  <div key={category} className="py-3">
                    <p className="text-muted-foreground mb-1 text-xs font-medium">
                      {categoryLabel(category)}
                    </p>
                    {permissions
                      .filter((p) => p.category === category)
                      .map((p) => {
                        const initialMode: OverrideMode =
                          p.key in overrides ? (overrides[p.key] ? "allow" : "deny") : "default";
                        return (
                          <PermissionOverrideRow
                            // key inclui o usuário: força remount ao trocar de usuário no
                            // seletor, senão o useState interno preservaria o "mode" do
                            // usuário anterior (React só reseta estado local quando a key muda).
                            key={`${selectedUser.id}-${p.id}`}
                            userId={selectedUser.id}
                            permissionId={p.id}
                            permissionKey={p.key}
                            permissionLabel={p.label}
                            roleDefaultAllows={roleDefaults.has(p.key)}
                            initialMode={initialMode}
                          />
                        );
                      })}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
