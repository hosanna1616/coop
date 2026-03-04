"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface KycProductsStepProps {
  leadId: string;
  businessName: string;
  /** Optional: defaults to /induct/[leadId] */
  backHref?: string;
  /** Optional: defaults to /induct/[leadId]/oath */
  continueHref?: string;
  /** Optional: persist form into parent state or API */
  onContinue?: (data: KycProductsFormData) => void;
}

export interface KycProductsFormData {
  tinNumber: string;
  mobileNumber: string;
  deployQrCode: boolean;
  deployPos: boolean;
}

export function KycProductsStep({
  leadId,
  businessName,
  backHref,
  continueHref,
  onContinue,
}: KycProductsStepProps) {
  const router = useRouter();
  const back = backHref ?? `/induct/${leadId}`;
  const next = continueHref ?? `/induct/${leadId}/oath`;

  const [tinNumber, setTinNumber] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [deployQrCode, setDeployQrCode] = useState(false);
  const [deployPos, setDeployPos] = useState(false);

  const formData: KycProductsFormData = {
    tinNumber,
    mobileNumber,
    deployQrCode,
    deployPos,
  };

  function handleContinue() {
    onContinue?.(formData);
    router.push(next);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">
      {/* Top Header */}
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
        <Link
          href={back}
          className="flex size-10 -ml-2 items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="Back"
        >
          <ChevronLeft className="size-6" />
        </Link>
        <h1 className="flex-1 font-mono text-lg font-semibold text-foreground">
          OP-02: MERCHANT INDUCTION
        </h1>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4">
        {/* Step Indicator */}
        <p className="text-center font-mono text-sm text-muted-foreground">
          Step 2 of 3: KYC & Products
        </p>

        {/* Merchant Context Card */}
        <Card className="border-border bg-card text-card-foreground">
          <CardContent className="py-4">
            <p className="font-mono text-base font-medium text-primary">
              {businessName}
            </p>
          </CardContent>
        </Card>

        {/* KYC Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="kyc-tin"
              className="text-foreground"
            >
              TIN Number
            </Label>
            <Input
              id="kyc-tin"
              type="text"
              value={tinNumber}
              onChange={(e) => setTinNumber(e.target.value)}
              className="min-h-[44px] bg-card placeholder:text-muted-foreground"
              placeholder="Tax identification number"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="kyc-mobile"
              className="text-foreground"
            >
              Mobile Number
            </Label>
            <Input
              id="kyc-mobile"
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              className="min-h-[44px] bg-card placeholder:text-muted-foreground"
              placeholder="+251 9XXXXXXXX"
            />
          </div>
        </div>

        {/* Products to Deploy - Toggle Switches */}
        <div className="space-y-4">
          <p className="font-mono text-sm font-medium text-muted-foreground">
            Products to Deploy
          </p>

          {/* Toggle: Deploy QR Code? */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
            <Label
              htmlFor="toggle-qr"
              className="cursor-pointer font-mono text-sm text-foreground"
            >
              Deploy QR Code?
            </Label>
            <button
              id="toggle-qr"
              type="button"
              role="switch"
              aria-checked={deployQrCode}
              onClick={() => setDeployQrCode((v) => !v)}
              className={cn(
                "relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors",
                deployQrCode
                  ? "border-primary bg-primary"
                  : "border-border bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-5 w-5 rounded-full bg-primary-foreground transition-all",
                  deployQrCode ? "left-8" : "left-1"
                )}
              />
            </button>
          </div>

          {/* Toggle: Deploy POS? */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
            <Label
              htmlFor="toggle-pos"
              className="cursor-pointer font-mono text-sm text-foreground"
            >
              Deploy POS?
            </Label>
            <button
              id="toggle-pos"
              type="button"
              role="switch"
              aria-checked={deployPos}
              onClick={() => setDeployPos((v) => !v)}
              className={cn(
                "relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors",
                deployPos
                  ? "border-primary bg-primary"
                  : "border-border bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-5 w-5 rounded-full bg-primary-foreground transition-all",
                  deployPos ? "left-8" : "left-1"
                )}
              />
            </button>
          </div>
        </div>

        <div className="flex-1" />
      </div>

      {/* Sticky Navigation Button */}
      <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-border bg-background p-4 safe-area-inset-bottom">
        <Button
          type="button"
          onClick={handleContinue}
          className="h-16 w-full text-lg font-bold"
        >
          CONTINUE TO OATH
        </Button>
      </div>
    </div>
  );
}
