"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  getMerchantsByBranch,
  getMerchantDetail,
  updateMerchantDetails,
  type MerchantDetail,
  type UpdateMerchantDetailsInput,
} from "@/app/actions/merchants";
import { getDeploymentAssets } from "@/app/actions/deployment-assets";
import type { DeploymentAssetRow } from "@/app/actions/deployment-assets";
import { MerchantDetailView } from "@/components/merchant-detail/MerchantDetailView";
import { cn } from "@/lib/utils";
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

type ViewFilter = "all" | "scouted" | "registered";

type UserRole = "PLAYER" | "BRANCH_MANAGER" | "ADMIN";

export function StaffMerchantsClient({ branchId, userRole, currentUserId }: { branchId: string; userRole: UserRole; currentUserId?: string }) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [leadsPage, setLeadsPage] = useState(0);
  const [merchantsPage, setMerchantsPage] = useState(0);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);
  const [merchantDetail, setMerchantDetail] = useState<MerchantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const limit = 20;

  const canEditMerchant =
    userRole === "BRANCH_MANAGER" ||
    (userRole === "PLAYER" && currentUserId != null && merchantDetail?.inductedBy?.id === currentUserId);

  const loadDetail = useCallback(async (merchantId: string) => {
    setDetailLoading(true);
    setMerchantDetail(null);
    setSaveError(null);
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

  const handleCloseDrawer = useCallback(() => {
    setSelectedMerchantId(null);
    setIsEditing(false);
    setSaveError(null);
  }, []);

  const handleSaveEdit = useCallback(
    async (data: UpdateMerchantDetailsInput) => {
      if (!selectedMerchantId) return;
      setSaving(true);
      setSaveError(null);
      const res = await updateMerchantDetails(selectedMerchantId, data);
      setSaving(false);
      if (res.ok) {
        setIsEditing(false);
        await loadDetail(selectedMerchantId);
        setMerchants((prev) =>
          prev.map((m) =>
            m.id === selectedMerchantId
              ? {
                  ...m,
                  ownerName: data.ownerName,
                  phoneNumber: data.phoneNumber,
                }
              : m
          )
        );
      } else {
        setSaveError(res.error ?? "Failed to save");
      }
    },
    [selectedMerchantId, loadDetail]
  );

  useEffect(() => {
    setLeadsPage(0);
    setMerchantsPage(0);
  }, [viewFilter, categoryFilter, search]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getLeadsByBranch({ branchId, limit: 200, offset: 0 }),
      getMerchantsByBranch({ branchId, limit: 200, offset: 0 }),
    ])
      .then(([leadsRes, merchantsRes]) => {
        setLeads(leadsRes.leads);
        setMerchants(merchantsRes.merchants);
      })
      .catch(() => {
        setLeads([]);
        setMerchants([]);
      })
      .finally(() => setLoading(false));
  }, [branchId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => set.add(l.category));
    merchants.forEach((m) => set.add(m.lead?.category ?? ""));
    return Array.from(set).filter(Boolean).sort();
  }, [leads, merchants]);

  const searchLower = search.trim().toLowerCase();
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (categoryFilter !== "all" && l.category !== categoryFilter) return false;
      if (searchLower && !l.businessName.toLowerCase().includes(searchLower)) return false;
      return true;
    });
  }, [leads, categoryFilter, searchLower]);

  const filteredMerchants = useMemo(() => {
    return merchants.filter((m) => {
      const name = m.lead?.businessName ?? m.ownerName;
      const cat = m.lead?.category ?? "";
      if (categoryFilter !== "all" && cat !== categoryFilter) return false;
      if (searchLower && !name.toLowerCase().includes(searchLower) && !m.ownerName.toLowerCase().includes(searchLower))
        return false;
      return true;
    });
  }, [merchants, categoryFilter, searchLower]);

  const paginatedLeads = useMemo(
    () => filteredLeads.slice(leadsPage * limit, leadsPage * limit + limit),
    [filteredLeads, leadsPage, limit]
  );
  const paginatedMerchants = useMemo(
    () => filteredMerchants.slice(merchantsPage * limit, merchantsPage * limit + limit),
    [filteredMerchants, merchantsPage, limit]
  );
  const totalLeadsPages = Math.ceil(filteredLeads.length / limit);
  const totalMerchantsPages = Math.ceil(filteredMerchants.length / limit);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <PortalLoadingInline className="min-h-[160px] w-full max-w-sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <label className="text-muted-foreground text-xs">View</label>
          <div className="flex rounded-md border border-border p-0.5" role="tablist">
            <FilterTab
              active={viewFilter === "all"}
              onClick={() => setViewFilter("all")}
              label="All"
            />
            <FilterTab
              active={viewFilter === "scouted"}
              onClick={() => setViewFilter("scouted")}
              label="Scouted"
            />
            <FilterTab
              active={viewFilter === "registered"}
              onClick={() => setViewFilter("registered")}
              label="Registered"
            />
          </div>
        </div>
        <div className="grid gap-1">
          <label className="text-muted-foreground text-xs">Category</label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <label className="text-muted-foreground text-xs">Search</label>
          <Input
            type="search"
            placeholder="Business or owner name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 font-mono text-sm"
          />
        </div>
      </div>

      {(viewFilter === "all" || viewFilter === "scouted") && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-mono text-base">Scouted leads</CardTitle>
            <span className="font-mono text-xs text-muted-foreground">
              {filteredLeads.length} total
            </span>
          </CardHeader>
          <CardContent>
            {filteredLeads.length === 0 ? (
              <p className="text-muted-foreground text-sm">No scouted leads match your filters.</p>
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
                        <th className="p-2 text-left text-muted-foreground">Date</th>
                        <th className="p-2 text-right text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLeads.map((l) => (
                        <tr key={l.id} className="border-b border-border/50">
                          <td className="p-2 font-medium">{l.businessName}</td>
                          <td className="p-2 text-muted-foreground">{l.category}</td>
                          <td className="p-2">{l.estimatedVolume}</td>
                          <td className="p-2">{l.scoutedBy.name}</td>
                          <td className="p-2 text-muted-foreground">
                            {new Date(l.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-2 text-right">
                            {l.status !== "CONVERTED" ? (
                              <Button size="sm" asChild>
                                <Link href={`/induct/${l.id}`}>Induct</Link>
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs">Converted</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalLeadsPages > 1 && (
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={leadsPage === 0}
                      onClick={() => setLeadsPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="font-mono text-xs text-muted-foreground">
                      Page {leadsPage + 1} of {totalLeadsPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={leadsPage >= totalLeadsPages - 1}
                      onClick={() => setLeadsPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {(viewFilter === "all" || viewFilter === "registered") && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-mono text-base">Registered merchants</CardTitle>
            <span className="font-mono text-xs text-muted-foreground">
              {filteredMerchants.length} total
            </span>
          </CardHeader>
          <CardContent>
            {filteredMerchants.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No registered merchants match your filters.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse font-mono text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="p-2 text-left text-muted-foreground">Owner / Business</th>
                        <th className="p-2 text-left text-muted-foreground">Category</th>
                        <th className="p-2 text-left text-muted-foreground">Phone</th>
                        <th className="p-2 text-left text-muted-foreground">Inducted by</th>
                        <th className="p-2 text-left text-muted-foreground">Onboarded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMerchants.map((m) => (
                        <tr
                          key={m.id}
                          className="cursor-pointer border-b border-border/50 hover:bg-muted/50"
                          onClick={() => setSelectedMerchantId(m.id)}
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
                          <td className="p-2 text-muted-foreground">
                            {new Date(m.onboardingDate).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalMerchantsPages > 1 && (
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={merchantsPage === 0}
                      onClick={() => setMerchantsPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="font-mono text-xs text-muted-foreground">
                      Page {merchantsPage + 1} of {totalMerchantsPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={merchantsPage >= totalMerchantsPages - 1}
                      onClick={() => setMerchantsPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Drawer open={!!selectedMerchantId} onOpenChange={(open) => !open && handleCloseDrawer()} direction="bottom">
        <DrawerContent className="max-h-[90vh] flex flex-col border-t border-border bg-card text-card-foreground">
          <DrawerTitle className="sr-only">Merchant details</DrawerTitle>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-8">
            {detailLoading ? (
              <div className="min-h-[80px]">
                <PortalLoadingInline className="min-h-[80px] py-4" />
              </div>
            ) : merchantDetail ? (
              isEditing ? (
                <MerchantEditForm
                  detail={merchantDetail}
                  saving={saving}
                  saveError={saveError}
                  onSave={handleSaveEdit}
                  onCancel={() => {
                    setIsEditing(false);
                    setSaveError(null);
                  }}
                />
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-mono text-lg font-semibold text-foreground">Merchant details</h2>
                    {canEditMerchant && (
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                        Edit
                      </Button>
                    )}
                  </div>
                  <MerchantDetailView
                    detail={merchantDetail}
                    fullDeploymentAssets
                    canEditMerchant={canEditMerchant}
                    merchantId={selectedMerchantId}
                    onAssetOnboardedChange={loadDetail}
                  />
                </>
              )
            ) : (
              <p className="font-mono text-sm text-muted-foreground">Merchant not found.</p>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

const PHONE_PREFIX = "+251";

function MerchantEditForm({
  detail,
  saving,
  saveError,
  onSave,
  onCancel,
}: {
  detail: MerchantDetail;
  saving: boolean;
  saveError: string | null;
  onSave: (data: UpdateMerchantDetailsInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [ownerName, setOwnerName] = useState(detail.ownerName);
  const [nationalIdNumber, setNationalIdNumber] = useState(detail.nationalIdNumber ?? "");
  const [tradeLicenseNumber, setTradeLicenseNumber] = useState(detail.tradeLicenseNumber ?? "");
  const [tinNumber, setTinNumber] = useState(detail.tinNumber ?? "");
  const [phoneNumber, setPhoneNumber] = useState(detail.phoneNumber);
  const [merchantAccountNumber, setMerchantAccountNumber] = useState(detail.merchantAccountNumber);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(
    () => detail.deploymentAssets?.map((a) => a.id) ?? []
  );
  const [availableAssets, setAvailableAssets] = useState<DeploymentAssetRow[]>([]);

  useEffect(() => {
    getDeploymentAssets().then((list) => setAvailableAssets(list));
  }, []);

  useEffect(() => {
    setOwnerName(detail.ownerName);
    setNationalIdNumber(detail.nationalIdNumber ?? "");
    setTradeLicenseNumber(detail.tradeLicenseNumber ?? "");
    setTinNumber(detail.tinNumber ?? "");
    setPhoneNumber(detail.phoneNumber);
    setMerchantAccountNumber(detail.merchantAccountNumber);
    setSelectedAssetIds(detail.deploymentAssets?.map((a) => a.id) ?? []);
  }, [detail]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ownerName,
      nationalIdNumber: nationalIdNumber || undefined,
      tradeLicenseNumber: tradeLicenseNumber || undefined,
      tinNumber: tinNumber || undefined,
      phoneNumber,
      merchantAccountNumber,
      deploymentAssetIds: selectedAssetIds,
    });
  };

  const toggleAsset = (id: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-lg font-semibold text-foreground">Edit merchant</h2>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
      {saveError && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
          {saveError}
        </p>
      )}
      <div className="grid gap-3 font-mono text-sm">
        <label className="grid gap-1">
          <span className="text-muted-foreground">Owner name</span>
          <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required className="font-mono" />
        </label>
        <label className="grid gap-1">
          <span className="text-muted-foreground">National ID (optional)</span>
          <Input value={nationalIdNumber} onChange={(e) => setNationalIdNumber(e.target.value)} className="font-mono" />
        </label>
        <label className="grid gap-1">
          <span className="text-muted-foreground">Trade license (optional)</span>
          <Input value={tradeLicenseNumber} onChange={(e) => setTradeLicenseNumber(e.target.value)} className="font-mono" />
        </label>
        <label className="grid gap-1">
          <span className="text-muted-foreground">TIN (optional)</span>
          <Input value={tinNumber} onChange={(e) => setTinNumber(e.target.value)} className="font-mono" />
        </label>
        <label className="grid gap-1">
          <span className="text-muted-foreground">Phone</span>
          <Input
            type="tel"
            value={phoneNumber}
            onChange={(e) => {
              const v = e.target.value;
              if (!v.startsWith(PHONE_PREFIX)) setPhoneNumber(PHONE_PREFIX + v.replace(/\D/g, ""));
              else setPhoneNumber(v);
            }}
            required
            className="font-mono"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-muted-foreground">Merchant account (optional)</span>
          <Input value={merchantAccountNumber} onChange={(e) => setMerchantAccountNumber(e.target.value)} className="font-mono" />
        </label>
        {availableAssets.length > 0 && (
          <div className="space-y-2">
            <span className="text-muted-foreground">Deployment assets (introduced to)</span>
            <div className="space-y-2 rounded-lg border border-border bg-card px-4 py-3">
              {availableAssets.map((a) => {
                const hasLink = a.link && a.link.trim().length > 0;
                const safeLink = hasLink && /^https?:\/\//i.test(a.link!.trim()) ? a.link!.trim() : null;
                return (
                  <label
                    key={a.id}
                    className="flex cursor-pointer items-start gap-2 rounded border border-transparent p-2 font-mono text-sm hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssetIds.includes(a.id)}
                      onChange={() => toggleAsset(a.id)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-border"
                    />
                    <span className="flex-1">
                      <span className="font-medium">{a.displayName}</span>
                      {a.description && (
                        <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{a.description}</p>
                      )}
                      {safeLink && (
                        <a
                          href={safeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-xs underline hover:no-underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View documentation
                        </a>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </form>
  );
}

function FilterTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 rounded px-3 text-xs font-mono",
        active ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
      )}
      onClick={onClick}
      role="tab"
      aria-selected={active}
    >
      {label}
    </Button>
  );
}
