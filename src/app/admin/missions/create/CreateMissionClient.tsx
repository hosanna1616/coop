"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMission } from "@/app/actions/mission";
import { getBranchesForAdmin } from "@/app/actions/users";

export function CreateMissionClient({
  callerRole,
  defaultBranchId,
  defaultTerritoryCellId = null,
  territoryCellCode = null,
}: {
  callerRole: string;
  defaultBranchId?: string | null;
  defaultTerritoryCellId?: string | null;
  territoryCellCode?: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [branchId, setBranchId] = useState<string | null>(defaultBranchId ?? null);
  const [territoryCellId] = useState<string | null>(defaultTerritoryCellId ?? null);
  const [branches, setBranches] = useState<{ id: string; branchCode: string | null; companyName: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultBranchId != null) setBranchId(defaultBranchId);
  }, [defaultBranchId]);

  useEffect(() => {
    if (callerRole === "ADMIN") {
      getBranchesForAdmin().then(setBranches).catch(() => setBranches([]));
    }
  }, [callerRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createMission({
        name: name.trim(),
        status,
        branchId: branchId ?? undefined,
        branchCode: branchId ? undefined : undefined,
        territoryCellId: territoryCellId ?? undefined,
      });
      router.push(branchId ? `/missions?branchId=${encodeURIComponent(branchId)}` : "/missions");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create mission");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="font-mono">Create Mission</CardTitle>
        {territoryCellCode && (
          <p className="text-sm text-muted-foreground">Cell: {territoryCellCode}</p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mission name"
              required
              className="font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Input
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="DRAFT"
              className="font-mono"
            />
          </div>
          {callerRole === "ADMIN" && branches.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="branch">Branch (optional)</Label>
              <Select value={branchId ?? ""} onValueChange={(v) => setBranchId(v || null)}>
                <SelectTrigger id="branch">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.companyName} {b.branchCode ? `(${b.branchCode})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? "Creating…" : "Create Mission"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/missions")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
