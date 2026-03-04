"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface VerifyStepProps {
  lead: {
    businessName: string;
    category: string;
    locationLat: number;
    locationLng: number;
    zone?: { code: string } | null;
  };
  onContinue: () => void;
}

export function VerifyStep({ lead, onContinue }: VerifyStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify business details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <strong>Business Name:</strong> {lead.businessName}
        </p>
        <p>
          <strong>Category:</strong> {lead.category}
        </p>
        <p>
          <strong>Zone:</strong> {lead.zone?.code ?? "—"}
        </p>
        <p>
          <strong>Location:</strong> {lead.locationLat.toFixed(5)}, {lead.locationLng.toFixed(5)}
        </p>
        <Button type="button" onClick={onContinue} className="min-h-[44px] w-full">
          Looks Good, Continue
        </Button>
      </CardContent>
    </Card>
  );
}
