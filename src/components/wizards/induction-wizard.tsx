"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { VerifyStep } from "@/components/wizards/induction/verify-step";
import { KycProductsStep } from "@/components/wizards/induction/kyc-products-step";
import type { KycProductsFormValues } from "@/components/wizards/induction/kyc-products-step";
import { OathStep } from "@/components/wizards/induction/oath-step";
import { updateMerchantProductsAndKYC, completeInduction } from "@/app/actions/merchants";
import { saveInductionDraft, clearInductionDraft } from "@/app/actions/induction-draft";

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
  /** Step to show on load (0–2). Used when resuming. */
  initialStep?: number;
  /** Prefill for KYC step when resuming. */
  initialKycValues?: Partial<KycProductsFormValues>;
}

export function InductionWizard({ lead, initialStep = 0, initialKycValues }: InductionWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  async function handleSaveAndContinueLater(stepIndex: number, kycFormData?: Partial<KycProductsFormValues>) {
    setError(null);
    setSubmitting(true);
    const result = await saveInductionDraft(lead.id, stepIndex, kycFormData ?? null);
    setSubmitting(false);
    if (result.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError(result.error ?? "Failed to save progress");
    }
  }

  async function handleKycContinue(data: KycProductsFormValues) {
    setError(null);
    setSubmitting(true);
    const result = await updateMerchantProductsAndKYC({
      leadId: lead.id,
      ownerName: data.ownerName,
      tradeLicenseNumber: data.tradeLicenseNumber ?? "",
      tinNumber: data.tinNumber ?? "",
      phoneNumber: data.phoneNumber,
      merchantAccountNumber: data.merchantAccountNumber ?? "",
    });
    setSubmitting(false);
    if (result.ok) {
      await clearInductionDraft(lead.id);
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
      await clearInductionDraft(lead.id);
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
          leadId={lead.id}
          lead={{
            businessName: lead.businessName,
            category: lead.category,
            locationLat: lead.locationLat,
            locationLng: lead.locationLng,
            zone: lead.zone,
          }}
          onContinue={next}
          onSaveProgress={() => handleSaveAndContinueLater(1)}
          saving={submitting}
        />
      )}

      {step === 1 && (
        <KycProductsStep
          leadId={lead.id}
          businessName={lead.businessName}
          defaultValues={initialKycValues}
          onContinue={handleKycContinue}
          onSaveProgress={(data) => handleSaveAndContinueLater(1, data)}
          saving={submitting}
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
