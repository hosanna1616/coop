import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { InductionWizard } from "@/components/wizards/induction-wizard";
import { getServerAuthSession } from "@/lib/auth";
import { getInductionDraft } from "@/app/actions/induction-draft";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, User } from "lucide-react";

export const dynamic = "force-dynamic";

const COOP_BANK_INDIVIDUAL_URL = "https://my.coopbankoromiasc.com/individualaccount";
const COOP_BANK_CORPORATE_URL = "https://my.coopbankoromiasc.com/oraganization";

export default async function InductPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const session = await getServerAuthSession();
  if (session?.role === "ADMIN") redirect("/");

  const { leadId } = await params;
  let lead: Awaited<
    ReturnType<
      typeof prisma.lead.findUnique<{
        where: { id: string };
        include: { zone: true; merchant: true };
      }>
    >
  > | null = null;
  try {
    lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { zone: true, merchant: true },
    });
  } catch {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground text-center text-sm">
          Database unavailable. Start PostgreSQL (e.g. <code className="rounded bg-muted px-1 py-0.5 text-xs">docker compose up -d</code>) then run <code className="rounded bg-muted px-1 py-0.5 text-xs">npx prisma migrate deploy</code>.
        </p>
      </div>
    );
  }
  if (!lead) notFound();
  if (lead.status === "CONVERTED") redirect("/");

  const draft = await getInductionDraft(leadId);
  let initialStep = 0;
  let initialKycValues: Partial<{
    ownerName: string;
    tradeLicenseNumber: string;
    tinNumber: string;
    phoneNumber: string;
    merchantAccountNumber: string;
  }> | undefined;

  if (lead.merchant) {
    initialStep = 2;
    initialKycValues = {
      ownerName: lead.merchant.ownerName,
      tradeLicenseNumber: lead.merchant.tradeLicenseNumber ?? "",
      tinNumber: lead.merchant.tinNumber ?? "",
      phoneNumber: lead.merchant.phoneNumber,
      merchantAccountNumber: lead.merchant.merchantAccountNumber ?? "",
    };
  } else if (draft) {
    initialStep = draft.currentStep;
    if (draft.kycFormData) initialKycValues = draft.kycFormData;
  }

  return (
    <div className="flex flex-1 flex-col p-4">
      <h1 className="mb-4 text-xl font-semibold text-foreground">Induct merchant</h1>

      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <p className="mb-3 font-mono text-sm font-medium text-foreground">
            Open an account — Cooperative Bank of Oromia
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={COOP_BANK_INDIVIDUAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 font-mono text-sm text-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <User className="size-4 shrink-0" aria-hidden />
              Individual account
            </a>
            <a
              href={COOP_BANK_CORPORATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 font-mono text-sm text-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Building2 className="size-4 shrink-0" aria-hidden />
              Corporate account
            </a>
          </div>
        </CardContent>
      </Card>

      <InductionWizard
        lead={{
          id: lead.id,
          businessName: lead.businessName,
          category: lead.category,
          locationLat: lead.locationLat,
          locationLng: lead.locationLng,
          zone: lead.zone ? { code: lead.zone.code } : null,
        }}
        initialStep={initialStep}
        initialKycValues={initialKycValues}
      />
    </div>
  );
}
