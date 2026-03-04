"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createDeploymentAsset,
  updateDeploymentAsset,
  type DeploymentAssetRow,
  type CreateAssetData,
} from "@/app/actions/deployment-assets";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "INACTIVE", label: "INACTIVE" },
  { value: "DEPRECATED", label: "DEPRECATED" },
] as const;

type DeploymentAssetFormProps = {
  /** When provided, form is in edit mode and name is read-only. */
  existing?: DeploymentAssetRow | null;
  onSuccess: () => void;
  onCancel: () => void;
};

export function DeploymentAssetForm({
  existing,
  onSuccess,
  onCancel,
}: DeploymentAssetFormProps) {
  const isEdit = Boolean(existing?.id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(existing?.name ?? "");
  const [displayName, setDisplayName] = useState(existing?.displayName ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [briefSteps, setBriefSteps] = useState(existing?.briefSteps ?? "");
  const [link, setLink] = useState(existing?.link ?? "");
  const [iconUrl, setIconUrl] = useState(existing?.iconUrl ?? "");
  const [status, setStatus] = useState<string>(existing?.status ?? "ACTIVE");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const militaryName = name.trim().toUpperCase().replace(/\s+/g, "_");
      if (isEdit && existing) {
        await updateDeploymentAsset(existing.id, {
          displayName: displayName.trim(),
          description: description.trim(),
          briefSteps: briefSteps.trim() || null,
          link: link.trim() || null,
          iconUrl: iconUrl.trim() || null,
          status: status as "ACTIVE" | "INACTIVE" | "DEPRECATED",
        });
      } else {
        const data: CreateAssetData = {
          name: militaryName,
          displayName: displayName.trim(),
          description: description.trim(),
          briefSteps: briefSteps.trim() || null,
          link: link.trim() || null,
          iconUrl: iconUrl.trim() || null,
          status: status as "ACTIVE" | "INACTIVE" | "DEPRECATED",
        };
        await createDeploymentAsset(data);
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
        <Label htmlFor="asset-name">Military name (e.g. DIGITAL_RELAY)</Label>
        <Input
          id="asset-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="DIGITAL_RELAY"
          required
          disabled={isEdit}
          className="font-mono"
          aria-describedby={isEdit ? "asset-name-immutable" : undefined}
        />
        {isEdit && (
          <p id="asset-name-immutable" className="text-xs text-muted-foreground">
            Name cannot be changed after creation.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="asset-displayName">Display name</Label>
        <Input
          id="asset-displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Digital QR Code Relay"
          required
          className="font-mono"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="asset-description">Description</Label>
        <Textarea
          id="asset-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this asset?"
          required
          rows={3}
          className="font-mono"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="asset-briefSteps">Brief deployment steps (optional)</Label>
        <Textarea
          id="asset-briefSteps"
          value={briefSteps}
          onChange={(e) => setBriefSteps(e.target.value)}
          placeholder="e.g. 1. Generate QR, 2. Activate"
          rows={2}
          className="font-mono"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="asset-link">Link to documentation (optional)</Label>
        <Input
          id="asset-link"
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://..."
          className="font-mono"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="asset-iconUrl">Icon URL (optional)</Label>
        <Input
          id="asset-iconUrl"
          type="url"
          value={iconUrl}
          onChange={(e) => setIconUrl(e.target.value)}
          placeholder="https://..."
          className="font-mono"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="asset-status">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id="asset-status" className="font-mono w-full">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="font-mono">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={submitting || !name.trim() || !displayName.trim() || !description.trim()}>
          {submitting ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save changes" : "Create asset"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
