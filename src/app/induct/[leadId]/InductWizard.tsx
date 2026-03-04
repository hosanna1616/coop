"use client";

import { InductionWizard } from "@/components/wizards/induction-wizard";
import type { LeadForInduction } from "@/components/wizards/induction-wizard";

/** @deprecated Use InductionWizard from @/components/wizards/induction-wizard */
export function InductWizard({ lead }: { lead: LeadForInduction }) {
  return <InductionWizard lead={lead} />;
}
