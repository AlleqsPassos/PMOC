import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Card padrão de "sem permissão" — reaproveitado por toda página que faz gate por hasPermission(). */
export function AccessDenied({
  message = "Você não tem permissão para acessar esta página.",
}: {
  message?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acesso restrito</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">{message}</CardContent>
    </Card>
  );
}
