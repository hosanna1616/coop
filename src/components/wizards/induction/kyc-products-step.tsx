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
  tradeLicenseNumber: z.string().optional(),
  tinNumber: z.string().optional(),
  phoneNumber: z
    .string()
    .min(1, "Mobile number is required")
    .regex(/^\+251\d{9}$/, "Enter 9 digits after +251 (e.g. +251912345678)"),
  merchantAccountNumber: z.string().min(1, "Merchant account number is required"),
});

export type KycProductsFormValues = z.infer<typeof kycProductsSchema>;

export interface KycProductsStepProps {
  leadId: string;
  businessName: string;
  defaultValues?: Partial<KycProductsFormValues>;
  onContinue: (data: KycProductsFormValues) => void | Promise<void>;
  /** When provided, show "Save and continue later" and call with current form values (may be partial). */
  onSaveProgress?: (data: Partial<KycProductsFormValues>) => void | Promise<void>;
  /** When true, disable Save and continue later (e.g. while saving). */
  saving?: boolean;
}

export function KycProductsStep({
  leadId,
  businessName,
  defaultValues,
  onContinue,
  onSaveProgress,
  saving,
}: KycProductsStepProps) {
  const form = useForm<KycProductsFormValues>({
    resolver: zodResolver(kycProductsSchema),
    defaultValues: {
      ownerName: "",
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
              name="tradeLicenseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trade License Number (optional)</FormLabel>
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
                  <FormLabel>TIN Number (optional)</FormLabel>
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
                          field.onChange(PHONE_PREFIX + v.replace(/\D/g, "").slice(0, 9));
                        } else {
                          const digits = v.slice(PHONE_PREFIX.length).replace(/\D/g, "").slice(0, 9);
                          field.onChange(PHONE_PREFIX + digits);
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
                  <FormLabel>Merchant Account Number</FormLabel>
                  <FormControl>
                    <Input
                      className="min-h-[44px]"
                      placeholder="Bank account number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="min-h-[44px] w-full">
              Continue to Oath
            </Button>
            {onSaveProgress && (
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px] w-full"
                onClick={() => onSaveProgress(form.getValues())}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save and continue later"}
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
