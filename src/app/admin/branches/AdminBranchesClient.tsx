"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBranch, getBranchesFromDb } from "@/app/actions/branches";
import { PortalLoadingInline } from "@/components/ui/portal-loading";

const PAGE_SIZE = 20;

type BranchRow = {
  id: string;
  branchCode: string | null;
  name: string;
};

export function AdminBranchesClient() {
  const [allBranches, setAllBranches] = useState<BranchRow[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const list = await getBranchesFromDb();
      setAllBranches(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filteredBranches = useMemo(() => {
    const q = branchSearch.trim().toLowerCase();
    if (!q) return allBranches;
    return allBranches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.branchCode?.toLowerCase().includes(q) ?? false)
    );
  }, [allBranches, branchSearch]);

  const totalFiltered = filteredBranches.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedBranches = useMemo(
    () =>
      filteredBranches.slice(
        currentPage * PAGE_SIZE,
        currentPage * PAGE_SIZE + PAGE_SIZE
      ),
    [filteredBranches, currentPage]
  );

  useEffect(() => {
    setPage((p) => (p >= totalPages ? Math.max(0, totalPages - 1) : p));
  }, [totalPages]);

  const goToPage = (newPage: number) => {
    if (newPage < 0 || newPage >= totalPages) return;
    setPage(newPage);
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="font-mono">Branches</CardTitle>
          <Button onClick={() => setCreateOpen(true)} className="font-mono">
            Create Branch
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="min-h-[120px]">
              <PortalLoadingInline className="min-h-[120px]" />
            </div>
          ) : allBranches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No branches. Create one below.</p>
          ) : (
            <>
              <div className="mb-4 grid gap-1">
                <Label htmlFor="branch-search" className="text-xs">Search by branch name or code</Label>
                <Input
                  id="branch-search"
                  type="search"
                  placeholder="Type to filter branches…"
                  value={branchSearch}
                  onChange={(e) => {
                    setBranchSearch(e.target.value);
                    setPage(0);
                  }}
                  className="max-w-xs font-mono"
                />
              </div>
              <ul className="flex flex-col gap-2">
                {paginatedBranches.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card/50 p-3 font-mono text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{b.name}</span>
                    <span className="text-muted-foreground">
                      {b.branchCode ?? "(no code)"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="outline" className="font-mono h-8">
                      <Link href={`/admin/operational-summary?branchId=${encodeURIComponent(b.id)}`}>
                        Operational Summary
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="font-mono h-8">
                      <Link href={`/missions?branchId=${encodeURIComponent(b.id)}`}>
                        Missions
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="font-mono h-8">
                      <Link href={`/admin/reports?branchId=${encodeURIComponent(b.id)}`}>
                        Reports
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="font-mono h-8">
                      <Link href={`/admin/users?branchId=${encodeURIComponent(b.id)}`}>
                        Users
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="font-mono h-8">
                      <Link href={`/admin/teams?branchId=${encodeURIComponent(b.id)}`}>
                        Teams
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
              </ul>
              {totalFiltered > PAGE_SIZE && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                  <span className="font-mono text-xs text-muted-foreground">
                    Page {currentPage + 1} of {totalPages} ({totalFiltered} branch{totalFiltered !== 1 ? "es" : ""})
                    {branchSearch.trim() ? " matching search" : ""})
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === 0 || loading}
                      onClick={() => goToPage(currentPage - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage >= totalPages - 1 || loading}
                      onClick={() => goToPage(currentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {createOpen && (
        <CreateBranchForm
          onClose={() => setCreateOpen(false)}
          onSuccess={async () => {
            setCreateOpen(false);
            await fetchAll();
            setPage(0);
          }}
        />
      )}
    </div>
  );
}

function CreateBranchForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createBranch({
        name: name.trim(),
        location: location.trim(),
        branchCode: branchCode.trim() || undefined,
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create branch");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-mono">Create Branch</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Branch name"
              required
              className="font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              required
              className="font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="branchCode">Branch code (optional)</Label>
            <Input
              id="branchCode"
              value={branchCode}
              onChange={(e) => setBranchCode(e.target.value)}
              placeholder="e.g. ET0010001"
              className="font-mono"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !name.trim() || !location.trim()}>
              {submitting ? "Creating…" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
