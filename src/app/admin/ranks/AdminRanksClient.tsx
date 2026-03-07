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
  createRank,
  updateRank,
  deleteRank,
  getRanksForAdmin,
  type RankRow,
  type CreateRankInput,
  type UpdateRankInput,
} from "@/app/actions/ranks";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { PortalLoadingInline } from "@/components/ui/portal-loading";

type AdminRanksClientProps = {
  initialRanks: RankRow[];
};

export function AdminRanksClient({
  initialRanks,
}: AdminRanksClientProps) {
  const [ranks, setRanks] = useState<RankRow[]>(initialRanks);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRank, setEditingRank] = useState<RankRow | null>(null);

  const refetch = async () => {
    setLoading(true);
    try {
      const list = await getRanksForAdmin();
      setRanks(list);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete rank "${name}"? Users with this rank must be reassigned first.`)) return;
    try {
      await deleteRank(id);
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete rank");
    }
  };

  const openCreate = () => {
    setEditingRank(null);
    setDialogOpen(true);
  };

  const openEdit = (rank: RankRow) => {
    setEditingRank(rank);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRank(null);
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button onClick={openCreate} className="font-mono">
          Add rank
        </Button>
      </div>

      <div className="rounded-md border">
        {loading ? (
          <div className="min-h-[160px] p-4">
            <PortalLoadingInline className="min-h-[140px]" />
          </div>
        ) : ranks.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No ranks configured. Add ranks to define officer progression (e.g. Cadet, Officer, Captain).
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono">Name</TableHead>
                <TableHead className="font-mono">Code</TableHead>
                <TableHead className="font-mono">Min XP</TableHead>
                <TableHead className="font-mono">Order</TableHead>
                <TableHead className="text-right font-mono">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranks.map((rank) => (
                <TableRow key={rank.id}>
                  <TableCell className="font-mono">{rank.name}</TableCell>
                  <TableCell className="font-mono">{rank.code}</TableCell>
                  <TableCell className="font-mono">{rank.minXp}</TableCell>
                  <TableCell className="font-mono">{rank.displayOrder}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="mr-2 font-mono"
                      onClick={() => openEdit(rank)}
                      aria-label={`Edit ${rank.name}`}
                    >
                      <PencilIcon className="mr-1 size-4" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-mono text-destructive hover:text-destructive"
                      onClick={() => handleDelete(rank.id, rank.name)}
                      aria-label={`Delete ${rank.name}`}
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

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingRank ? "Edit rank" : "Add rank"}
            </DialogTitle>
          </DialogHeader>
          <RankForm
            initial={editingRank ?? undefined}
            onSuccess={async () => {
              closeDialog();
              await refetch();
            }}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RankForm({
  initial,
  onSuccess,
  onCancel,
}: {
  initial?: RankRow;
  onSuccess: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [minXp, setMinXp] = useState(initial?.minXp ?? 0);
  const [displayOrder, setDisplayOrder] = useState(initial?.displayOrder ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (initial) {
        await updateRank(initial.id, {
          name: name.trim(),
          minXp: Number(minXp),
          displayOrder: Number(displayOrder),
        });
      } else {
        const input: CreateRankInput = {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          minXp: Number(minXp),
          displayOrder: Number(displayOrder),
        };
        await createRank(input);
      }
      await onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save rank");
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
        <Label htmlFor="rank-name">Name</Label>
        <Input
          id="rank-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Cadet"
          className="font-mono"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="rank-code">Code</Label>
        <Input
          id="rank-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. CADET"
          className="font-mono"
          required
          disabled={!!initial}
        />
        {initial && (
          <p className="text-xs text-muted-foreground">Code cannot be changed after creation.</p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="rank-minXp">Min XP</Label>
        <Input
          id="rank-minXp"
          type="number"
          min={0}
          value={minXp}
          onChange={(e) => setMinXp(parseInt(e.target.value, 10) || 0)}
          className="font-mono"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="rank-displayOrder">Display order</Label>
        <Input
          id="rank-displayOrder"
          type="number"
          min={0}
          value={displayOrder}
          onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
          className="font-mono"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={submitting || !name.trim() || !code.trim()}>
          {submitting ? "Saving..." : initial ? "Save" : "Create"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
