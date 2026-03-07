"use client";

import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createScoutCategory,
  updateScoutCategory,
  deleteScoutCategory,
  getScoutCategoriesForAdmin,
  getScoutCategoryById,
  type ScoutCategoryRow,
  type CreateScoutCategoryData,
} from "@/app/actions/scout-categories";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { PortalLoadingInline } from "@/components/ui/portal-loading";

const ICON_OPTIONS = [
  "Coffee",
  "ShoppingCart",
  "Pill",
  "Fuel",
  "Store",
  "UtensilsCrossed",
  "Building2",
  "Banknote",
  "Camera",
  "Shirt",
  "Car",
  "Other",
];

type AdminCategoriesClientProps = {
  initialCategories: ScoutCategoryRow[];
};

export function AdminCategoriesClient({ initialCategories }: AdminCategoriesClientProps) {
  const [categories, setCategories] = useState<ScoutCategoryRow[]>(initialCategories);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<ScoutCategoryRow | null | undefined>(undefined);
  const editLoaded = editingCategory !== undefined;

  const refetch = async () => {
    setLoading(true);
    try {
      const list = await getScoutCategoriesForAdmin();
      setCategories(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (editingId && dialogOpen) {
      setEditingCategory(undefined);
      getScoutCategoryById(editingId).then((c) => setEditingCategory(c ?? null));
    } else {
      setEditingCategory(undefined);
    }
  }, [editingId, dialogOpen]);

  const openCreate = () => {
    setEditingId(null);
    setEditingCategory(null);
    setDialogOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setEditingCategory(undefined);
  };

  const handleSuccess = () => {
    closeDialog();
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? Leads may still reference its name.")) return;
    try {
      await deleteScoutCategory(id);
      refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const isEditMode = Boolean(editingId);
  const showForm = !isEditMode || (editLoaded && editingCategory !== null);
  const showNotFound = isEditMode && editLoaded && editingCategory === null;

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button onClick={openCreate} className="font-mono">
          Add category
        </Button>
      </div>

      <div className="rounded-md border">
        {loading ? (
          <div className="min-h-[160px] p-4">
            <PortalLoadingInline className="min-h-[140px]" />
          </div>
        ) : categories.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No scout categories. Add one so staff can select categories when scouting merchants.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono">Name</TableHead>
                <TableHead className="font-mono">Display name</TableHead>
                <TableHead className="font-mono">Icon</TableHead>
                <TableHead className="font-mono">Order</TableHead>
                <TableHead className="font-mono">Active</TableHead>
                <TableHead className="text-right font-mono">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-mono">{cat.name}</TableCell>
                  <TableCell>{cat.displayName}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{cat.iconName ?? "—"}</TableCell>
                  <TableCell className="font-mono">{cat.displayOrder}</TableCell>
                  <TableCell>
                    <span className={cat.active ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                      {cat.active ? "Yes" : "No"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="mr-2 font-mono" onClick={() => openEdit(cat.id)} aria-label={`Edit ${cat.displayName}`}>
                      <PencilIcon className="size-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" className="font-mono text-destructive hover:text-destructive" onClick={() => handleDelete(cat.id)} aria-label={`Delete ${cat.displayName}`}>
                      <Trash2Icon className="size-4 mr-1" />
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
            <DialogTitle className="font-mono">{isEditMode ? "Edit scout category" : "Add scout category"}</DialogTitle>
          </DialogHeader>
          {showForm && (
            <ScoutCategoryForm
              existing={isEditMode ? editingCategory ?? null : undefined}
              onSuccess={handleSuccess}
              onCancel={closeDialog}
            />
          )}
          {showNotFound && <p className="text-sm text-muted-foreground">Category not found.</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScoutCategoryForm({
  existing,
  onSuccess,
  onCancel,
}: {
  existing?: ScoutCategoryRow | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(existing?.id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(existing?.name ?? "");
  const [displayName, setDisplayName] = useState(existing?.displayName ?? "");
  const [iconName, setIconName] = useState(existing?.iconName ?? "");
  const [displayOrder, setDisplayOrder] = useState(String(existing?.displayOrder ?? 0));
  const [active, setActive] = useState(existing?.active ?? true);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDisplayName(existing.displayName);
      setIconName(existing.iconName ?? "");
      setDisplayOrder(String(existing.displayOrder));
      setActive(existing.active);
    }
  }, [existing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit && existing) {
        await updateScoutCategory(existing.id, {
          displayName: displayName.trim(),
          iconName: iconName.trim() || null,
          displayOrder: parseInt(displayOrder, 10) || 0,
          active,
        });
      } else {
        const data: CreateScoutCategoryData = {
          name: name.trim(),
          displayName: displayName.trim(),
          iconName: iconName.trim() || null,
          displayOrder: parseInt(displayOrder, 10) || 0,
        };
        await createScoutCategory(data);
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
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
        <Label htmlFor="cat-name">Name (unique, e.g. Cafe)</Label>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Cafe"
          required
          disabled={isEdit}
          className="font-mono"
        />
        {isEdit && <p className="text-xs text-muted-foreground">Name cannot be changed after creation.</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cat-displayName">Display name</Label>
        <Input
          id="cat-displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Cafe"
          required
          className="font-mono"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cat-iconName">Lucide icon name (optional)</Label>
        <Select value={iconName || "_"} onValueChange={(v) => setIconName(v === "_" ? "" : v)}>
          <SelectTrigger id="cat-iconName" className="font-mono w-full">
            <SelectValue placeholder="Select or leave empty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_" className="font-mono">— None —</SelectItem>
            {ICON_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt} className="font-mono">
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cat-displayOrder">Display order</Label>
        <Input
          id="cat-displayOrder"
          type="number"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(e.target.value)}
          className="font-mono w-24"
        />
      </div>
      {isEdit && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="cat-active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="cat-active" className="font-mono text-sm">Active (show in scout form)</Label>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={submitting || !name.trim() || !displayName.trim()}>
          {submitting ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save" : "Create"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
