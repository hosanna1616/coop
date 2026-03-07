"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createExternalBank,
  deleteExternalBank,
  getExternalBanksForAdmin,
  type ExternalBankRow,
} from "@/app/actions/external-banks";
import { Trash2Icon } from "lucide-react";
import { PortalLoadingInline } from "@/components/ui/portal-loading";

type AdminExternalBanksClientProps = {
  initialBanks: ExternalBankRow[];
};

export function AdminExternalBanksClient({
  initialBanks,
}: AdminExternalBanksClientProps) {
  const [banks, setBanks] = useState<ExternalBankRow[]>(initialBanks);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refetch = async () => {
    setLoading(true);
    try {
      const list = await getExternalBanksForAdmin();
      setBanks(list);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete other service "${name}"?`)) return;
    try {
      await deleteExternalBank(id);
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete bank");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button onClick={() => setDialogOpen(true)} className="font-mono">
          Add other service
        </Button>
      </div>

      <div className="rounded-md border">
        {loading ? (
          <div className="min-h-[160px] p-4">
            <PortalLoadingInline className="min-h-[140px]" />
          </div>
        ) : banks.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No other services configured. Add one so players can select it during scouting.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono">Name</TableHead>
                <TableHead className="text-right font-mono">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banks.map((bank) => (
                <TableRow key={bank.id}>
                  <TableCell className="font-mono">{bank.name}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-mono text-destructive hover:text-destructive"
                      onClick={() => handleDelete(bank.id, bank.name)}
                      aria-label={`Delete ${bank.name}`}
                    >
                      <Trash2Icon className="mr-1 size-4" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="font-mono">Add other service</DialogTitle>
          </DialogHeader>
          <ExternalBankForm
            onSuccess={async () => {
              setDialogOpen(false);
              await refetch();
            }}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExternalBankForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createExternalBank(name);
      await onSuccess();
      setName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create bank");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="grid gap-2">
        <Label htmlFor="external-bank-name">Bank name</Label>
        <Input
          id="external-bank-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. CBE"
          className="font-mono"
          required
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={submitting || !name.trim()}>
          {submitting ? "Creating..." : "Create"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
