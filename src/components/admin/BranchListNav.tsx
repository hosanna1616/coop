"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.branchCode?.toLowerCase().includes(q) ?? false)
    );
  }, [branches, search]);

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
          onChange={(e) => setSearch(e.target.value)}
          className="font-mono"
        />
      </div>
      <ul className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border p-3 font-mono text-sm text-muted-foreground">
            {search.trim() ? "No branches match your search." : "No branches."}
          </li>
        ) : (
          filtered.map((b) => (
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
    </div>
  );
}
