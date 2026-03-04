"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const OATH_TEXT = `I commit to operate as a Merchant Nation citizen in good standing. I will uphold the standards of service and integrity expected of our network. I understand that my citizen number and participation are subject to the terms of Merchant Nation.`;

export interface OathStepProps {
  leadId: string;
  onComplete: (oathSignatureUrl: string) => void | Promise<void>;
  submitting?: boolean;
}

export function OathStep({ leadId, onComplete, submitting = false }: OathStepProps) {
  const [signaturePlaceholder, setSignaturePlaceholder] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = signaturePlaceholder.trim() || "data:text/plain;base64,cGxhY2Vob2xkZXI=";
    onComplete(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>The Oath</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-foreground font-medium">Merchant Nation Oath</p>
        <p className="text-muted-foreground text-sm whitespace-pre-wrap">{OATH_TEXT}</p>

        <div
          className="border-input flex min-h-[120px] items-center justify-center rounded-md border border-dashed bg-muted/30"
          aria-label="Signature pad placeholder"
        >
          <span className="text-muted-foreground text-sm">
            Signature pad placeholder (capture in production)
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="oath-signature-url">Signature URL (placeholder)</Label>
            <Input
              id="oath-signature-url"
              type="text"
              placeholder="Optional: paste signature image URL"
              value={signaturePlaceholder}
              onChange={(e) => setSignaturePlaceholder(e.target.value)}
              className="min-h-[44px]"
            />
          </div>
          <Button type="submit" className="min-h-[44px] w-full" disabled={submitting}>
            {submitting ? "Submitting…" : "Complete Induction (+100 XP)"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
