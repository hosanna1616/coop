import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { InductionWizard } from "@/components/wizards/induction-wizard";

export const dynamic = "force-dynamic";

export default async function InductPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  let lead: Awaited<ReturnType<typeof prisma.lead.findUnique<{ where: { id: string }; include: { zone: true } }>>> | null = null;
  try {
    lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { zone: true },
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
  return (
    <div className="flex flex-1 flex-col p-4">
      <h1 className="mb-4 text-xl font-semibold text-foreground">Induct merchant</h1>
      <InductionWizard
        lead={{
          id: lead.id,
          businessName: lead.businessName,
          category: lead.category,
          locationLat: lead.locationLat,
          locationLng: lead.locationLng,
          zone: lead.zone ? { code: lead.zone.code } : null,
        }}
      />
    </div>
  );
}
