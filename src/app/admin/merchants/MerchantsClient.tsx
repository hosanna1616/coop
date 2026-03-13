"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { getLeadsByBranch } from "@/app/actions/leads-list";
import { getMerchantsByBranch, getMerchantDetail } from "@/app/actions/merchants";
import type { MerchantDetail } from "@/app/actions/merchants";
import { MerchantDetailView } from "@/components/merchant-detail/MerchantDetailView";
import { getBranchesFromDb } from "@/app/actions/branches";
import { PortalLoadingInline } from "@/components/ui/portal-loading";

type LeadRow = {
  id: string;
  businessName: string;
  category: string;
  status: string;
  estimatedVolume: string;
  createdAt: Date;
  scoutedBy: { id: string; name: string };
  branchName: string | null;
};

type MerchantRow = {
  id: string;
  ownerName: string;
  citizenNumber: string;
  phoneNumber: string;
  onboardingDate: Date;
  inductedBy: { id: string; name: string };
  branchName: string | null;
  lead: { businessName: string; category: string } | null;
};

export function MerchantsClient({
  isAdmin,
  defaultBranchId,
  showBackToBranches,
}: {
  isAdmin: boolean;
  defaultBranchId: string | null;
  showBackToBranches?: boolean;
}) {
  const router = useRouter();
  const [branchId, setBranchId] = useState<string | null>(defaultBranchId);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchSearch, setBranchSearch] = useState("");
  const [leadsPage, setLeadsPage] = useState(0);
  const [merchantsPage, setMerchantsPage] = useState(0);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);
  const [merchantDetail, setMerchantDetail] = useState<MerchantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const limit = 20;

  const loadDetail = useCallback(async (merchantId: string) => {
    setDetailLoading(true);
    setMerchantDetail(null);
    try {
      const detail = await getMerchantDetail(merchantId);
      setMerchantDetail(detail ?? null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMerchantId) loadDetail(selectedMerchantId);
    else setMerchantDetail(null);
  }, [selectedMerchantId, loadDetail]);

  const filteredBranches = useMemo(() => {
    const q = branchSearch.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) => b.name.toLowerCase().includes(q));
  }, [branches, branchSearch]);

  useEffect(() => {
    setBranchId(defaultBranchId);
  }, [defaultBranchId]);

  useEffect(() => {
    if (isAdmin) {
      getBranchesFromDb()
        .then((list) => setBranches(list.map((b) => ({ id: b.id, name: b.name }))))
        .catch(() => setBranches([]));
    }
  }, [isAdmin]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      {showBackToBranches && (
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/merchants" className="hover:text-foreground">
            ← Back to branch list
          </Link>
        </p>
      )}
      {isAdmin && branches.length > 0 && (
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid gap-1">
            <Label className="text-xs">Branch</Label>
            <Input
              type="search"
              placeholder="Search branch name…"
              value={branchSearch}
              onChange={(e) => setBranchSearch(e.target.value)}
              className="w-48 font-mono text-sm"
            />
            <Select
              value={branchId ?? "all"}
              onValueChange={(v) => {
                if (v === "all") {
                  setBranchId(null);
                  router.push("/admin/merchants");
                } else {
                  setBranchId(v);
                  router.push(`/admin/merchants?branchId=${v}`);
                }
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {filteredBranches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <ScoutedLeadsSection
        branchId={branchId}
        page={leadsPage}
        onPageChange={setLeadsPage}
        limit={limit}
        isAdmin={isAdmin}
      />

      <RegisteredMerchantsSection
        branchId={branchId}
        page={merchantsPage}
        onPageChange={setMerchantsPage}
        limit={limit}
        isAdmin={isAdmin}
        onViewMerchant={setSelectedMerchantId}
      />

      <Drawer
        open={!!selectedMerchantId}
        onOpenChange={(open) => !open && setSelectedMerchantId(null)}
        direction="bottom"
      >
        <DrawerContent className="max-h-[90vh] flex flex-col border-t border-border bg-card text-card-foreground">
          <DrawerTitle className="sr-only">Merchant details</DrawerTitle>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-8">
            {detailLoading ? (
              <div className="min-h-[80px]">
                <PortalLoadingInline className="min-h-[80px] py-4" />
              </div>
            ) : merchantDetail ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-mono text-lg font-semibold text-foreground">Merchant details</h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedMerchantId(null)}
                  >
                    Close
                  </Button>
                </div>
                <MerchantDetailView detail={merchantDetail} fullDeploymentAssets={false} />
              </>
            ) : (
              <p className="font-mono text-sm text-muted-foreground">Merchant not found.</p>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function ScoutedLeadsSection({
  branchId,
  page,
  onPageChange,
  limit,
  isAdmin,
}: {
  branchId: string | null;
  page: number;
  onPageChange: (n: number) => void;
  limit: number;
  isAdmin: boolean;
}) {
  const [data, setData] = useState<{ leads: LeadRow[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId && !isAdmin) {
      setData({ leads: [], total: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    getLeadsByBranch({ branchId, limit, offset: page * limit })
      .then((r) => setData({ leads: r.leads, total: r.total }))
      .catch(() => setData({ leads: [], total: 0 }))
      .finally(() => setLoading(false));
  }, [branchId, isAdmin, page, limit]);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-mono text-base">Scouted leads</CardTitle>
        {data != null && (
          <span className="font-mono text-xs text-muted-foreground">
            {data.total} total{" "}
            {!isAdmin
              ? "(your branch staff)"
              : branchId
                ? "(this branch)"
                : "(all branches)"}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {!branchId && !isAdmin ? (
          <p className="text-sm text-muted-foreground">
            Select a branch to view scouted leads.
          </p>
        ) : loading ? (
          <div className="min-h-[120px]">
            <PortalLoadingInline className="min-h-[120px]" />
          </div>
        ) : !data || data.leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {branchId ? "No scouted leads for this branch." : "No scouted leads."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-2 text-left text-muted-foreground">Business</th>
                    <th className="p-2 text-left text-muted-foreground">Category</th>
                    <th className="p-2 text-left text-muted-foreground">Volume</th>
                    <th className="p-2 text-left text-muted-foreground">Scouted by</th>
                    {isAdmin && (
                      <th className="p-2 text-left text-muted-foreground">Branch</th>
                    )}
                    <th className="p-2 text-left text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leads.map((l) => (
                    <tr key={l.id} className="border-b border-border/50">
                      <td className="p-2 font-medium">{l.businessName}</td>
                      <td className="p-2 text-muted-foreground">{l.category}</td>
                      <td className="p-2">{l.estimatedVolume}</td>
                      <td className="p-2">{l.scoutedBy.name}</td>
                      {isAdmin && (
                        <td className="p-2 text-muted-foreground">
                          {l.branchName ?? "—"}
                        </td>
                      )}
                      <td className="p-2 text-muted-foreground">
                        {new Date(l.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => onPageChange(page - 1)}
                >
                  Previous
                </Button>
                <span className="font-mono text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages - 1}
                  onClick={() => onPageChange(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RegisteredMerchantsSection({
  branchId,
  page,
  onPageChange,
  limit,
  isAdmin,
  onViewMerchant,
}: {
  branchId: string | null;
  page: number;
  onPageChange: (n: number) => void;
  limit: number;
  isAdmin: boolean;
  onViewMerchant: (id: string) => void;
}) {
  const [data, setData] = useState<{
    merchants: MerchantRow[];
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId && !isAdmin) {
      setData({ merchants: [], total: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    getMerchantsByBranch({ branchId, limit, offset: page * limit })
      .then((r) => setData({ merchants: r.merchants, total: r.total }))
      .catch(() => setData({ merchants: [], total: 0 }))
      .finally(() => setLoading(false));
  }, [branchId, isAdmin, page, limit]);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-mono text-base">Registered merchants</CardTitle>
        {data != null && (
          <span className="font-mono text-xs text-muted-foreground">
            {data.total} total{" "}
            {!isAdmin
              ? "(your branch staff)"
              : branchId
                ? "(this branch)"
                : "(all branches)"}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {!branchId && !isAdmin ? (
          <p className="text-sm text-muted-foreground">
            Select a branch to view registered merchants.
          </p>
        ) : loading ? (
          <div className="min-h-[120px]">
            <PortalLoadingInline className="min-h-[120px]" />
          </div>
        ) : !data || data.merchants.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {branchId
              ? "No registered merchants for this branch."
              : "No registered merchants."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-2 text-left text-muted-foreground">
                      Owner / Business
                    </th>
                    <th className="p-2 text-left text-muted-foreground">Category</th>
                    <th className="p-2 text-left text-muted-foreground">Phone</th>
                    <th className="p-2 text-left text-muted-foreground">
                      Inducted by
                    </th>
                    {isAdmin && (
                      <th className="p-2 text-left text-muted-foreground">Branch</th>
                    )}
                    <th className="p-2 text-left text-muted-foreground">Onboarded</th>
                  </tr>
                </thead>
                <tbody>
                  {data.merchants.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => onViewMerchant(m.id)}
                    >
                      <td className="p-2 font-medium">
                        {m.ownerName}
                        {m.lead ? ` · ${m.lead.businessName}` : ""}
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {m.lead?.category ?? "—"}
                      </td>
                      <td className="p-2">{m.phoneNumber}</td>
                      <td className="p-2">{m.inductedBy.name}</td>
                      {isAdmin && (
                        <td className="p-2 text-muted-foreground">
                          {m.branchName ?? "—"}
                        </td>
                      )}
                      <td className="p-2 text-muted-foreground">
                        {new Date(m.onboardingDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => onPageChange(page - 1)}
                >
                  Previous
                </Button>
                <span className="font-mono text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages - 1}
                  onClick={() => onPageChange(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

