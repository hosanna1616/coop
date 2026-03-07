"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;

export type BranchForList = {
  id: string;
  name: string;
  branchCode: string | null;
};

export function BranchListNav({
  branches,
  basePath,
  title = "Select a branch",
}: {
  branches: BranchForList[];
  basePath: string;
  title?: string;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.branchCode?.toLowerCase().includes(q) ?? false)
    );
  }, [branches, search]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = useMemo(
    () =>
      filtered.slice(
        currentPage * PAGE_SIZE,
        currentPage * PAGE_SIZE + PAGE_SIZE
      ),
    [filtered, currentPage]
  );

  useEffect(() => {
    setPage((p) => (p >= totalPages ? Math.max(0, totalPages - 1) : p));
  }, [totalPages]);

  const goToPage = (newPage: number) => {
    if (newPage < 0 || newPage >= totalPages) return;
    setPage(newPage);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <div className="grid gap-1">
        <Label htmlFor="branch-search" className="text-xs">Search by branch name or code</Label>
        <Input
          id="branch-search"
          type="search"
          placeholder="Type to filter branches…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="font-mono"
        />
      </div>
      <ul className="flex flex-col gap-2">
        {paginated.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border p-3 font-mono text-sm text-muted-foreground">
            {search.trim() ? "No branches match your search." : "No branches."}
          </li>
        ) : (
          paginated.map((b) => (
            <li key={b.id}>
              <Link
                href={`${basePath}?branchId=${b.id}`}
                className="block rounded-lg border border-border bg-card/50 p-3 font-mono text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {b.name}
                {b.branchCode ? (
                  <span className="ml-2 text-muted-foreground">({b.branchCode})</span>
                ) : null}
              </Link>
            </li>
          ))
        )}
      </ul>
      {totalFiltered > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <span className="font-mono text-xs text-muted-foreground">
            Page {currentPage + 1} of {totalPages} ({totalFiltered} branch{totalFiltered !== 1 ? "es" : ""}
            {search.trim() ? " matching search" : ""})
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 0}
              onClick={() => goToPage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages - 1}
              onClick={() => goToPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
