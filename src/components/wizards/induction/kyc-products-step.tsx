"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PHONE_PREFIX = "+251";

const kycProductsSchema = z.object({
  ownerName: z.string().min(1, "Owner name is required"),
  nationalIdNumber: z.string().min(1, "National ID is required"),
  tradeLicenseNumber: z.string().min(1, "Trade license is required"),
  tinNumber: z.string().min(1, "TIN is required"),
  phoneNumber: z.string().min(1, "Mobile number is required"),
  merchantAccountNumber: z.string().optional(),
});

export type KycProductsFormValues = z.infer<typeof kycProductsSchema>;

export interface KycProductsStepProps {
  leadId: string;
  businessName: string;
  activeDeploymentAssets?: { id: string; name: string; displayName: string }[];
  defaultValues?: Partial<KycProductsFormValues>;
  onContinue: (data: KycProductsFormValues) => void | Promise<void>;
}

export function KycProductsStep({
  leadId,
  businessName,
  activeDeploymentAssets = [],
  defaultValues,
  onContinue,
}: KycProductsStepProps) {
  const form = useForm<KycProductsFormValues>({
    resolver: zodResolver(kycProductsSchema),
    defaultValues: {
      ownerName: "",
      nationalIdNumber: "",
      tradeLicenseNumber: "",
      tinNumber: "",
      phoneNumber: PHONE_PREFIX,
      merchantAccountNumber: "",
      ...defaultValues,
    },
  });

  async function handleSubmit(values: KycProductsFormValues) {
    await onContinue(values);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>KYC & Products</CardTitle>
        <p className="text-muted-foreground text-sm">{businessName}</p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            id="kyc-products-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="ownerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner&apos;s Full Name</FormLabel>
                  <FormControl>
                    <Input className="min-h-[44px]" placeholder="Full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nationalIdNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>National ID Number</FormLabel>
                  <FormControl>
                    <Input className="min-h-[44px]" placeholder="National ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tradeLicenseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trade License Number</FormLabel>
                  <FormControl>
                    <Input className="min-h-[44px]" placeholder="Trade license" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tinNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TIN Number</FormLabel>
                  <FormControl>
                    <Input className="min-h-[44px]" placeholder="TIN" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      className="min-h-[44px]"
                      placeholder={PHONE_PREFIX + " 9XXXXXXXX"}
                      {...field}
                      value={field.value}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v.startsWith(PHONE_PREFIX)) {
                          field.onChange(PHONE_PREFIX + v.replace(/\D/g, ""));
                        } else {
                          field.onChange(v);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="merchantAccountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Merchant Account Number (optional)</FormLabel>
                  <FormControl>
                    <Input
                      className="min-h-[44px]"
                      placeholder="Bank account placeholder"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {activeDeploymentAssets.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="font-mono text-xs font-medium text-muted-foreground">
                  On induction this merchant will be introduced to these deployment assets:
                </p>
                <ul className="mt-2 list-inside list-disc font-mono text-xs text-foreground">
                  {activeDeploymentAssets.map((a) => (
                    <li key={a.id}>{a.displayName}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button type="submit" className="min-h-[44px] w-full">
              Continue to Oath
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
