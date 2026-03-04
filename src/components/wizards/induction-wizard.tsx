"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { VerifyStep } from "@/components/wizards/induction/verify-step";
import { KycProductsStep } from "@/components/wizards/induction/kyc-products-step";
import type { KycProductsFormValues } from "@/components/wizards/induction/kyc-products-step";
import { OathStep } from "@/components/wizards/induction/oath-step";
import { updateMerchantProductsAndKYC, completeInduction } from "@/app/actions/merchants";
import { getDeploymentAssets } from "@/app/actions/deployment-assets";

const STEPS = ["Verify", "KYC & Products", "The Oath"] as const;

export interface LeadForInduction {
  id: string;
  businessName: string;
  category: string;
  locationLat: number;
  locationLng: number;
  zone: { code: string } | null;
}

export interface InductionWizardProps {
  lead: LeadForInduction;
}

export function InductionWizard({ lead }: InductionWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAssets, setActiveAssets] = useState<{ id: string; name: string; displayName: string }[]>([]);

  useEffect(() => {
    getDeploymentAssets().then((list) =>
      setActiveAssets(list.map((a) => ({ id: a.id, name: a.name, displayName: a.displayName })))
    );
  }, []);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  async function handleKycContinue(data: KycProductsFormValues) {
    setError(null);
    setSubmitting(true);
    const result = await updateMerchantProductsAndKYC({
      leadId: lead.id,
      ownerName: data.ownerName,
      nationalIdNumber: data.nationalIdNumber,
      tradeLicenseNumber: data.tradeLicenseNumber,
      tinNumber: data.tinNumber,
      phoneNumber: data.phoneNumber,
      merchantAccountNumber: data.merchantAccountNumber ?? "",
    });
    setSubmitting(false);
    if (result.ok) {
      next();
    } else {
      setError(result.error ?? "Failed to save KYC");
    }
  }

  async function handleOathComplete(oathSignatureUrl: string) {
    setError(null);
    setSubmitting(true);
    const result = await completeInduction({
      leadId: lead.id,
      oathSignatureUrl,
    });
    setSubmitting(false);
    if (result.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError(result.error ?? "Induction failed");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </p>

      {step === 0 && (
        <VerifyStep
          lead={{
            businessName: lead.businessName,
            category: lead.category,
            locationLat: lead.locationLat,
            locationLng: lead.locationLng,
            zone: lead.zone,
          }}
          onContinue={next}
        />
      )}

      {step === 1 && (
        <KycProductsStep
          leadId={lead.id}
          businessName={lead.businessName}
          activeDeploymentAssets={activeAssets}
          onContinue={handleKycContinue}
        />
      )}

      {step === 2 && (
        <OathStep
          leadId={lead.id}
          onComplete={handleOathComplete}
          submitting={submitting}
        />
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={step === 0 ? () => router.back() : prev}
          className="min-h-[44px] flex-1"
          disabled={submitting}
        >
          {step === 0 ? "Back" : "Previous"}
        </Button>
        {step < STEPS.length - 1 && step !== 1 && (
          <Button onClick={next} className="min-h-[44px] flex-1">
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
