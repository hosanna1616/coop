"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { MerchantDetail } from "@/app/actions/merchants";
import { setDeploymentAssetOnboarded } from "@/app/actions/merchants";

type DeploymentAssetItem = MerchantDetail["deploymentAssets"][number];

/** Compact inline row: label left, value right */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 py-1 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className="min-w-0 truncate font-medium text-foreground" title={value}>{value}</span>
    </div>
  );
}

function DeploymentAssetCard({
  asset,
  merchantId,
  canEdit,
  onToggleOnboarded,
}: {
  asset: DeploymentAssetItem;
  merchantId: string | null;
  canEdit: boolean;
  onToggleOnboarded: (merchantId: string) => void;
}) {
  const [toggling, setToggling] = useState(false);
  const hasLink = (asset.link?.trim().length ?? 0) > 0;
  const safeLink = hasLink && asset.link && /^https?:\/\//i.test(asset.link.trim()) ? asset.link.trim() : null;

  const handleOnboardedChange = async (checked: boolean) => {
    if (!merchantId) return;
    setToggling(true);
    const res = await setDeploymentAssetOnboarded(merchantId, asset.id, checked);
    setToggling(false);
    if (res.ok) onToggleOnboarded(merchantId);
  };

  return (
    <Card className="border-border bg-muted/20">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          {asset.iconUrl && (
            <img src={asset.iconUrl} alt="" className="h-8 w-8 shrink-0 rounded object-contain" />
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-semibold text-foreground">{asset.displayName}</p>
            {asset.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{asset.description}</p>
            )}
            {asset.briefSteps && (
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap rounded bg-muted/50 p-2">
                {asset.briefSteps}
              </pre>
            )}
            {safeLink && (
              <a
                href={safeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-sm text-primary underline hover:no-underline"
              >
                Open documentation
              </a>
            )}
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-2">
              {canEdit && (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!asset.onboardedAt}
                    disabled={toggling}
                    onChange={(e) => handleOnboardedChange(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Mark as onboarded
                </label>
              )}
              {asset.onboardedAt && (
                <span className="text-xs text-muted-foreground">
                  Onboarded {new Date(asset.onboardedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Fullscreen image overlay */
function ImageFullscreen({
  src,
  alt,
  caption,
  onClose,
}: {
  src: string;
  alt: string;
  caption?: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={caption ?? "Image fullscreen"}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 z-10 rounded-full bg-white/10 text-white hover:bg-white/20"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="size-5" />
      </Button>
      <button
        type="button"
        className="flex max-h-full max-w-full flex-col items-center justify-center focus:outline-none"
        onClick={onClose}
      >
        <img
          src={src}
          alt={alt}
          className="max-h-[85vh] max-w-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        {caption && (
          <span className="mt-2 text-sm text-white/80">{caption}</span>
        )}
      </button>
    </div>
  );
}

export type MerchantDetailViewProps = {
  detail: MerchantDetail;
  fullDeploymentAssets?: boolean;
  canEditMerchant?: boolean;
  merchantId?: string | null;
  onAssetOnboardedChange?: (merchantId: string) => void;
};

export function MerchantDetailView({
  detail,
  fullDeploymentAssets: fullAssets = true,
  canEditMerchant = false,
  merchantId = null,
  onAssetOnboardedChange = () => {},
}: MerchantDetailViewProps) {
  const [fullscreenImage, setFullscreenImage] = useState<"business" | "signature" | null>(null);
  const hasLeadPhoto = detail.lead?.photoUrl && detail.lead.photoUrl.length > 0;
  const hasSignature = detail.oathSignatureUrl && detail.oathSignatureUrl.length > 0;
  const hasPhotos = hasLeadPhoto || hasSignature;

  return (
    <div className="space-y-4">
      {fullscreenImage === "business" && hasLeadPhoto && (
        <ImageFullscreen
          src={detail.lead!.photoUrl!}
          alt="Business photo"
          caption="Business"
          onClose={() => setFullscreenImage(null)}
        />
      )}
      {fullscreenImage === "signature" && hasSignature && (
        <ImageFullscreen
          src={detail.oathSignatureUrl!}
          alt="Oath signature"
          caption="Oath signature"
          onClose={() => setFullscreenImage(null)}
        />
      )}

      {/* Single dense card: identity + profile + contact + status + lead */}
      <div className="rounded-lg border border-border bg-card text-card-foreground overflow-hidden">
        {/* Photos strip — compact */}
        {hasPhotos && (
          <div className="flex gap-3 border-b border-border bg-muted/20 px-3 py-2">
            {hasLeadPhoto && (
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFullscreenImage("business")}
                  className="cursor-zoom-in rounded border border-border transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <img
                    src={detail.lead!.photoUrl!}
                    alt="Business"
                    className="h-14 w-14 object-cover"
                  />
                </button>
                <span className="text-muted-foreground text-[11px]">Business</span>
              </div>
            )}
            {hasSignature && (
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFullscreenImage("signature")}
                  className="cursor-zoom-in rounded border border-border transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <img
                    src={detail.oathSignatureUrl!}
                    alt="Oath signature"
                    className="h-10 w-24 object-contain bg-muted/50"
                  />
                </button>
                <span className="text-muted-foreground text-[11px]">Signature</span>
              </div>
            )}
          </div>
        )}

        <div className="p-3">
          {/* Owner prominent, then grid */}
          <p className="mb-3 font-semibold text-foreground text-sm">{detail.ownerName}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0 sm:grid-cols-3">
            <Row label="Citizen #" value={detail.citizenNumber} />
            <Row label="Phone" value={detail.phoneNumber} />
            <Row label="Onboarded" value={new Date(detail.onboardingDate).toLocaleDateString()} />
            <Row label="National ID" value={detail.nationalIdNumber ?? "—"} />
            <Row label="Merchant acct" value={detail.merchantAccountNumber || "—"} />
            <Row label="Inducted by" value={detail.inductedBy.name} />
            <Row label="Trade license" value={detail.tradeLicenseNumber ?? "—"} />
            <Row label="TIN" value={detail.tinNumber ?? "—"} />
          </div>

          {detail.lead && (
            <>
              <div className="my-3 border-t border-border" />
              <p className="mb-1.5 text-muted-foreground text-[11px] font-medium uppercase tracking-wider">Lead</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0 sm:grid-cols-3">
                <Row label="Business" value={detail.lead.businessName} />
                <Row label="Category" value={detail.lead.category} />
                <Row label="Volume" value={detail.lead.estimatedVolume} />
                <Row label="Location" value={`${detail.lead.locationLat.toFixed(4)}, ${detail.lead.locationLng.toFixed(4)}`} />
                <Row label="Scouted" value={new Date(detail.lead.createdAt).toLocaleString()} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Deployment assets — full cards (description, steps, link, onboarded) */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/20 px-3 py-1.5">
          <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Deployment assets</span>
        </div>
        <div className="p-3 space-y-3">
          {detail.deploymentAssets?.length ? (
            fullAssets ? (
              detail.deploymentAssets.map((a) => (
                <DeploymentAssetCard
                  key={a.id}
                  asset={a}
                  merchantId={canEditMerchant ? merchantId : null}
                  canEdit={!!canEditMerchant}
                  onToggleOnboarded={onAssetOnboardedChange}
                />
              ))
            ) : (
              <p className="text-foreground text-xs py-1">
                {detail.deploymentAssets.map((a) => a.displayName).join(", ")}
              </p>
            )
          ) : (
            <p className="text-muted-foreground text-xs py-1">None</p>
          )}
        </div>
      </div>
    </div>
  );
}
