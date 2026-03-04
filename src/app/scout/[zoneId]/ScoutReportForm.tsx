"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  Coffee,
  ShoppingCart,
  Pill,
  Fuel,
  Camera,
  ChevronLeft,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const scoutFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  category: z.string().min(1, "Select a category"),
  photo: z.instanceof(FileList).optional(),
});

type ScoutFormValues = z.infer<typeof scoutFormSchema>;

const CATEGORIES = [
  { id: "coffee", label: "Coffee", Icon: Coffee },
  { id: "retail", label: "Retail", Icon: ShoppingCart },
  { id: "pharmacy", label: "Pharmacy", Icon: Pill },
  { id: "fuel", label: "Fuel", Icon: Fuel },
] as const;

const GPS_PLACEHOLDER = "GPS LOCKED: 9.034, 38.741";

export function ScoutReportForm({
  zoneId,
  zoneCode,
}: {
  zoneId: string;
  zoneCode: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ScoutFormValues>({
    resolver: zodResolver(scoutFormSchema),
    defaultValues: {
      businessName: "",
      category: "",
      photo: undefined,
    },
  });

  const photoFiles = form.watch("photo");
  const hasPhoto = photoFiles && photoFiles.length > 0;

  function onSubmit(values: ScoutFormValues) {
    console.log("Scout report:", values);
    // TODO: submit to API
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">
      {/* Top Header */}
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
        <Link
          href="/"
          className="flex size-10 -ml-2 items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="Back to map"
        >
          <ChevronLeft className="size-6" />
        </Link>
        <h1 className="flex-1 font-mono text-lg font-semibold text-foreground">
          OP-01: RECON REPORT
        </h1>
      </header>

      <Form {...form}>
        <form
          id="scout-report-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-6 p-4"
        >
          {/* Zone & GPS Info (Read-only Card) */}
          <Card className="border-border bg-card text-card-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="font-mono text-sm font-medium text-muted-foreground">
                Zone & GPS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 font-mono text-sm">
              <p className="text-primary">{zoneCode}</p>
              <p className="text-muted-foreground">{GPS_PLACEHOLDER}</p>
            </CardContent>
          </Card>

          {/* Business Name */}
          <FormField
            control={form.control}
            name="businessName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Business Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="bg-card placeholder:text-muted-foreground"
                    placeholder="Enter business name"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Business Category - 2x2 grid of buttons */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">
                  Business Category
                </FormLabel>
                <FormControl>
                  <div
                    ref={field.ref}
                    className="grid grid-cols-2 gap-3"
                    role="group"
                    aria-label="Business category"
                  >
                    {CATEGORIES.map(({ id, label, Icon }) => (
                      <Button
                        key={id}
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-14 w-full border-2 bg-card font-medium hover:bg-muted",
                          field.value === id
                            ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                            : "border-border"
                        )}
                        onClick={() => field.onChange(id)}
                      >
                        <Icon className="size-5 shrink-0" aria-hidden />
                        {label}
                      </Button>
                    ))}
                  </div>
                </FormControl>
              </FormItem>
            )}
          />

          {/* Photo Evidence */}
          <FormField
            control={form.control}
            name="photo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">
                  Photo Evidence
                </FormLabel>
                <FormControl>
                  <input
                    ref={fileInputRef}
                    type="file"
                    capture="environment"
                    accept="image/*"
                    className="sr-only"
                    aria-hidden
                    onChange={(e) => field.onChange(e.target.files)}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-dashed border-border p-8 text-center transition-colors",
                    "hover:border-muted-foreground/50 hover:bg-muted/50",
                    hasPhoto && "border-primary bg-primary/10"
                  )}
                >
                  <Camera
                    className={cn(
                      "size-12 shrink-0",
                      hasPhoto ? "text-primary" : "text-muted-foreground"
                    )}
                    aria-hidden
                  />
                  <span className="font-mono text-sm text-muted-foreground">
                    {hasPhoto
                      ? `${photoFiles!.length} image(s) captured`
                      : "Tap to Capture Storefront Image"}
                  </span>
                </button>
              </FormItem>
            )}
          />

          {/* Spacer so submit button doesn't cover content */}
          <div className="flex-1" />
        </form>

      {/* Sticky Submit Button - above bottom nav */}
      <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-border bg-background p-4 safe-area-inset-bottom">
        <Button
          type="submit"
          form="scout-report-form"
          className="h-16 w-full text-lg font-bold"
        >
          TRANSMIT INTEL (+20 XP)
        </Button>
      </div>
      </Form>
    </div>
  );
}
