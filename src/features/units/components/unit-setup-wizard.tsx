"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createEnvironment,
  createSector,
  createUnit,
  type UnitFormState,
} from "@/features/units/actions";
import {
  createEquipment,
  type EquipmentFormState,
} from "@/features/equipment/actions";

const NONE = "none";

type Created = { id: string; name: string };
type ClientOption = { id: string; name: string };

const STEPS = [
  { key: "unit", label: "Unidade" },
  { key: "sectors", label: "Setores" },
  { key: "environments", label: "Ambientes" },
  { key: "equipment", label: "Equipamentos" },
] as const;

/**
 * Assistente de cadastro da estrutura física (Fase 8). Antes cada camada era
 * um diálogo avulso na página da unidade, numa ordem que só quem conhecia o
 * modelo de dados adivinhava.
 *
 * Cada etapa grava na hora, via as mesmas Server Actions dos diálogos — não é
 * um formulário transacional gigante. Abandonar no meio deixa dados válidos e
 * reaproveitáveis (a unidade existe, é só continuar por ela depois), mesmo
 * precedente do wizard de atendimento da Fase 4.
 */
export function UnitSetupWizard({
  clients,
  fixedClientId,
}: {
  clients: ClientOption[];
  fixedClientId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [unit, setUnit] = useState<Created | null>(null);
  const [sectors, setSectors] = useState<Created[]>([]);
  const [environments, setEnvironments] = useState<Created[]>([]);
  const [equipment, setEquipment] = useState<Created[]>([]);

  function finish() {
    if (unit) router.push(`/unidades/${unit.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={
                i === step
                  ? "text-foreground font-medium"
                  : i < step
                    ? "text-muted-foreground"
                    : "text-muted-foreground/60"
              }
            >
              {i < step && <Check className="mr-1 inline size-3" />}
              {i + 1}. {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <ArrowRight className="text-muted-foreground/40 size-3" />
            )}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <UnitStep
          clients={clients}
          fixedClientId={fixedClientId}
          onCreated={(created) => {
            setUnit(created);
            setStep(1);
          }}
        />
      )}

      {step === 1 && unit && (
        <SectorStep
          unit={unit}
          sectors={sectors}
          onCreated={(created) => setSectors((prev) => [...prev, created])}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && unit && (
        <EnvironmentStep
          unit={unit}
          sectors={sectors}
          environments={environments}
          onCreated={(created) => setEnvironments((prev) => [...prev, created])}
          onNext={() => setStep(3)}
          onFinish={finish}
        />
      )}

      {step === 3 && unit && (
        <EquipmentStep
          unit={unit}
          sectors={sectors}
          environments={environments}
          equipment={equipment}
          onCreated={(created) => setEquipment((prev) => [...prev, created])}
          onFinish={finish}
        />
      )}
    </div>
  );
}

/** Lista do que já foi criado na etapa — feedback de que cada item foi salvo. */
function CreatedList({ items, empty }: { items: Created[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{empty}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <Badge key={i.id} variant="secondary">
          <Check className="mr-1 size-3" />
          {i.name}
        </Badge>
      ))}
    </div>
  );
}

function UnitStep({
  clients,
  fixedClientId,
  onCreated,
}: {
  clients: ClientOption[];
  fixedClientId?: string;
  onCreated: (created: Created) => void;
}) {
  const [state, action, pending] = useActionState<UnitFormState, FormData>(
    async (prev, formData) => {
      const result = await createUnit(prev, formData);
      if (result?.success && result.createdId) {
        onCreated({ id: result.createdId, name: result.createdName ?? "Unidade" });
      }
      return result;
    },
    undefined,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dados da unidade</CardTitle>
        <CardDescription>
          O prédio ou endereço onde os equipamentos ficam.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex max-w-xl flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clientId">Cliente</Label>
            {fixedClientId ? (
              <>
                <input type="hidden" name="clientId" value={fixedClientId} />
                <p className="text-muted-foreground text-sm">
                  {clients.find((c) => c.id === fixedClientId)?.name ?? "—"}
                </p>
              </>
            ) : (
              <Select name="clientId" required>
                <SelectTrigger id="clientId" className="w-full">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {state?.fieldErrors?.clientId && (
              <p className="text-destructive text-sm">{state.fieldErrors.clientId[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome da unidade</Label>
            <Input id="name" name="name" required placeholder="Ex.: Bloco A" />
            {state?.fieldErrors?.name && (
              <p className="text-destructive text-sm">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="responsibleName">Responsável (opcional)</Label>
              <Input id="responsibleName" name="responsibleName" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <Input id="phone" name="phone" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          {state?.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}

          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Criando…" : "Criar e continuar"}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SectorStep({
  unit,
  sectors,
  onCreated,
  onNext,
}: {
  unit: Created;
  sectors: Created[];
  onCreated: (created: Created) => void;
  onNext: () => void;
}) {
  const [state, action, pending] = useActionState<UnitFormState, FormData>(
    async (prev, formData) => {
      const result = await createSector(prev, formData);
      if (result?.success && result.createdId) {
        onCreated({ id: result.createdId, name: result.createdName ?? "Setor" });
      }
      return result;
    },
    undefined,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Setores de {unit.name}</CardTitle>
        <CardDescription>
          Camada opcional — serve para agrupar ambientes em unidades grandes
          (ex.: &ldquo;Ala Norte&rdquo;). Se não fizer sentido aqui, pule.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* key força um form novo a cada item criado, limpando os campos sem
            precisar de ref/reset manual. */}
        <form
          key={sectors.length}
          action={action}
          className="flex max-w-xl flex-col gap-3"
        >
          <input type="hidden" name="unitId" value={unit.id} />
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="sector-name">Nome do setor</Label>
              <Input id="sector-name" name="name" required placeholder="Ex.: Ala Norte" />
            </div>
            <Button type="submit" variant="secondary" disabled={pending}>
              <Plus className="size-4" />
              {pending ? "Salvando…" : "Adicionar"}
            </Button>
          </div>
          {state?.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}
        </form>

        <CreatedList items={sectors} empty="Nenhum setor adicionado." />

        <div>
          <Button onClick={onNext}>
            {sectors.length === 0 ? "Pular setores" : "Continuar"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EnvironmentStep({
  unit,
  sectors,
  environments,
  onCreated,
  onNext,
  onFinish,
}: {
  unit: Created;
  sectors: Created[];
  environments: Created[];
  onCreated: (created: Created) => void;
  onNext: () => void;
  onFinish: () => void;
}) {
  const [state, action, pending] = useActionState<UnitFormState, FormData>(
    async (prev, formData) => {
      const result = await createEnvironment(prev, formData);
      if (result?.success && result.createdId) {
        onCreated({ id: result.createdId, name: result.createdName ?? "Ambiente" });
      }
      return result;
    },
    undefined,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ambientes de {unit.name}</CardTitle>
        <CardDescription>
          A sala onde o equipamento está instalado. Todo equipamento precisa de
          um ambiente.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          key={environments.length}
          action={action}
          className="flex max-w-xl flex-col gap-3"
        >
          <input type="hidden" name="unitId" value={unit.id} />
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="env-name">Nome do ambiente</Label>
              <Input id="env-name" name="name" required placeholder="Ex.: Recepção" />
            </div>
            {sectors.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="env-sector">Setor</Label>
                <Select name="sectorId" defaultValue={NONE}>
                  <SelectTrigger id="env-sector" className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem setor</SelectItem>
                    {sectors.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" variant="secondary" disabled={pending}>
              <Plus className="size-4" />
              {pending ? "Salvando…" : "Adicionar"}
            </Button>
          </div>
          {state?.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}
        </form>

        <CreatedList items={environments} empty="Nenhum ambiente adicionado." />

        <div className="flex gap-2">
          <Button onClick={onNext} disabled={environments.length === 0}>
            Continuar para equipamentos
            <ArrowRight className="size-4" />
          </Button>
          <Button variant="outline" onClick={onFinish}>
            Concluir sem equipamentos
          </Button>
        </div>
        {environments.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Cadastre ao menos um ambiente para poder incluir equipamentos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function EquipmentStep({
  unit,
  sectors,
  environments,
  equipment,
  onCreated,
  onFinish,
}: {
  unit: Created;
  sectors: Created[];
  environments: Created[];
  equipment: Created[];
  onCreated: (created: Created) => void;
  onFinish: () => void;
}) {
  const [state, action, pending] = useActionState<EquipmentFormState, FormData>(
    async (prev, formData) => {
      const result = await createEquipment(prev, formData);
      if (result?.success && result.createdId) {
        onCreated({ id: result.createdId, name: result.createdName ?? "Equipamento" });
      }
      return result;
    },
    undefined,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Equipamentos de {unit.name}</CardTitle>
        <CardDescription>
          A tag é o identificador único do equipamento na empresa inteira.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          key={equipment.length}
          action={action}
          className="flex max-w-2xl flex-col gap-3"
        >
          <input type="hidden" name="unitId" value={unit.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eq-tag">Tag</Label>
              <Input id="eq-tag" name="tag" required placeholder="Ex.: AC-001" />
              {state?.fieldErrors?.tag && (
                <p className="text-destructive text-sm">{state.fieldErrors.tag[0]}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eq-env">Ambiente</Label>
              <Select name="environmentId" required>
                <SelectTrigger id="eq-env" className="w-full">
                  <SelectValue placeholder="Selecione o ambiente" />
                </SelectTrigger>
                <SelectContent>
                  {environments.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {sectors.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="eq-sector">Setor (opcional)</Label>
                <Select name="sectorId" defaultValue={NONE}>
                  <SelectTrigger id="eq-sector" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem setor</SelectItem>
                    {sectors.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eq-type">Tipo (opcional)</Label>
              <Input id="eq-type" name="type" placeholder="Ex.: Split" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eq-brand">Marca (opcional)</Label>
              <Input id="eq-brand" name="brand" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eq-model">Modelo (opcional)</Label>
              <Input id="eq-model" name="model" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eq-capacity">Capacidade BTU (opcional)</Label>
              <Input id="eq-capacity" name="capacityBtu" type="number" />
            </div>
          </div>

          {state?.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}

          <div>
            <Button type="submit" variant="secondary" disabled={pending}>
              <Plus className="size-4" />
              {pending ? "Salvando…" : "Adicionar equipamento"}
            </Button>
          </div>
        </form>

        <CreatedList items={equipment} empty="Nenhum equipamento adicionado." />

        <div className="flex items-center gap-2">
          <Button onClick={onFinish}>
            <Check className="size-4" />
            Concluir
          </Button>
          <Link
            href={`/unidades/${unit.id}`}
            className="text-muted-foreground text-sm hover:underline"
          >
            Ver a unidade
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
