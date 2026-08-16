import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listCompanyUsers } from "@/features/users/queries";
import { listPendingInvites } from "@/features/invites/queries";
import { InviteTechnicianForm } from "@/features/invites/components/invite-technician-form";
import { RevokeInviteButton } from "@/features/invites/components/revoke-invite-button";
import { CopyInviteLinkButton } from "@/features/invites/components/copy-invite-link-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Usuários — PMOC+" };

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  RESPONSAVEL_TECNICO: "Responsável Técnico",
};

export default async function UsuariosPage() {
  await requireUser();
  const allowed = await hasPermission("manage_users");

  if (!allowed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso restrito</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Você não tem permissão para gerenciar usuários.
        </CardContent>
      </Card>
    );
  }

  const [users, invites] = await Promise.all([
    listCompanyUsers(),
    listPendingInvites(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground text-sm">
            Administradores e responsáveis técnicos da sua empresa.
          </p>
        </div>
        <InviteTechnicianForm />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipe</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground text-center"
                  >
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.fullName}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{ROLE_LABELS[u.roleKey] ?? u.roleKey}</TableCell>
                    <TableCell>
                      <Badge variant={u.status === "active" ? "default" : "secondary"}>
                        {u.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Convites pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.fullName ?? "—"}</TableCell>
                    <TableCell className="font-mono">{invite.code}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(invite.expiresAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="flex items-center gap-1">
                      <CopyInviteLinkButton code={invite.code} />
                      <RevokeInviteButton inviteId={invite.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
