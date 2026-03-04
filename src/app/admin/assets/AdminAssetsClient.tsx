"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { DeploymentAssetForm } from "@/components/forms/deployment-asset-form";
import {
  getDeploymentAssetsForAdmin,
  getDeploymentAssetById,
  type DeploymentAssetRow,
} from "@/app/actions/deployment-assets";
import { PencilIcon } from "lucide-react";
import { PortalLoadingInline } from "@/components/ui/portal-loading";

type AdminAssetsClientProps = {
  initialAssets: DeploymentAssetRow[];
};

export function AdminAssetsClient({ initialAssets }: AdminAssetsClientProps) {
  const [assets, setAssets] = useState<DeploymentAssetRow[]>(initialAssets);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<DeploymentAssetRow | null | undefined>(undefined);
  const editLoaded = editingAsset !== undefined;

  const refetch = async () => {
    setLoading(true);
    try {
      const list = await getDeploymentAssetsForAdmin();
      setAssets(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (editingId && dialogOpen) {
      setEditingAsset(undefined);
      getDeploymentAssetById(editingId).then((a) => setEditingAsset(a ?? null));
    } else {
      setEditingAsset(undefined);
    }
  }, [editingId, dialogOpen]);

  const openCreate = () => {
    setEditingId(null);
    setEditingAsset(null);
    setDialogOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setEditingAsset(undefined);
  };

  const handleSuccess = () => {
    closeDialog();
    refetch();
  };

  const isEditMode = Boolean(editingId);
  const showForm = !isEditMode || (editLoaded && editingAsset !== null);
  const showNotFound = isEditMode && editLoaded && editingAsset === null;

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button
          onClick={openCreate}
          className="bg-cyan-600 font-mono hover:bg-cyan-700"
        >
          ADD NEW ASSET
        </Button>
      </div>

      <div className="rounded-md border">
        {loading ? (
          <div className="min-h-[160px] p-4">
            <PortalLoadingInline className="min-h-[140px]" />
          </div>
        ) : assets.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No deployment assets. Add one to get started.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono">Name</TableHead>
                <TableHead className="font-mono">Display Name</TableHead>
                <TableHead className="font-mono">Status</TableHead>
                <TableHead className="font-mono text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-mono">{asset.name}</TableCell>
                  <TableCell>{asset.displayName}</TableCell>
                  <TableCell>
                    <span
                      className={`font-mono text-xs font-medium ${
                        asset.status === "ACTIVE"
                          ? "text-green-600 dark:text-green-400"
                          : asset.status === "DEPRECATED"
                            ? "text-muted-foreground"
                            : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {asset.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-blue-600 font-mono text-white hover:bg-blue-700 hover:text-white"
                      onClick={() => openEdit(asset.id)}
                      aria-label={`Edit ${asset.displayName}`}
                    >
                      <PencilIcon className="size-4 mr-1" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg" showCloseButton={true}>
          <DialogHeader>
            <DialogTitle className="font-mono text-cyan-400">
              {isEditMode ? "Edit deployment asset" : "Add new deployment asset"}
            </DialogTitle>
          </DialogHeader>
          {!editLoaded && isEditMode && (
            <div className="min-h-[80px]">
              <PortalLoadingInline className="min-h-[80px] py-4" />
            </div>
          )}
          {showForm && (
            <DeploymentAssetForm
              existing={isEditMode ? editingAsset ?? null : undefined}
              onSuccess={handleSuccess}
              onCancel={closeDialog}
            />
          )}
          {showNotFound && (
            <p className="text-sm text-muted-foreground">Asset not found.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
