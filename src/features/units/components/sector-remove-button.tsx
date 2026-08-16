"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { removeSector } from "@/features/units/actions";

export function SectorRemoveButton({
  sectorId,
  unitId,
  name,
}: {
  sectorId: string;
  unitId: string;
  name: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Trash2 className="text-muted-foreground size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover setor &quot;{name}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Ambientes já cadastrados neste setor continuam existindo, apenas
            ficam sem setor associado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <form action={removeSector.bind(null, sectorId, unitId)}>
            <AlertDialogAction type="submit" variant="destructive">
              Remover
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
