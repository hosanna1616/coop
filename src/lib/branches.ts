/**
 * Branch list source of truth from branches.json.
 * Structure: { id: number, branchCode: string, companyName: string }
 */

import { readFileSync } from "fs";
import { join } from "path";

export type BranchItem = {
  id: number;
  branchCode: string;
  companyName: string;
};

let cached: BranchItem[] | null = null;

function loadBranches(): BranchItem[] {
  if (cached) return cached;
  try {
    const path = join(process.cwd(), "branches.json");
    const raw = readFileSync(path, "utf-8");
    const data = JSON.parse(raw) as BranchItem[];
    if (!Array.isArray(data)) {
      cached = [];
      return cached;
    }
    cached = data;
    return cached;
  } catch {
    cached = [];
    return cached;
  }
}

/** All branches from branches.json, sorted by companyName */
export function getBranches(): BranchItem[] {
  const list = loadBranches();
  return [...list].sort((a, b) =>
    (a.companyName ?? "").localeCompare(b.companyName ?? "")
  );
}

export function getBranchById(id: number): BranchItem | undefined {
  return loadBranches().find((b) => b.id === id);
}

export function getBranchByCode(branchCode: string): BranchItem | undefined {
  return loadBranches().find(
    (b) => b.branchCode?.toLowerCase() === branchCode?.toLowerCase()
  );
}
