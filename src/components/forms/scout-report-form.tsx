"use client";

import { useRef, useState, useEffect } from "react";
import {
  Coffee,
  ShoppingCart,
  Pill,
  Fuel,
  Camera,
  type LucideIcon,
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
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createLead, type ScoutZoneInput } from "@/app/actions/leads";

const VOLUME_OPTIONS = ["LOW", "MEDIUM", "HIGH"] as const;

const scoutReportSchema = z
  .object({
    businessName: z.string().min(1, "Business name is required"),
    category: z.string().min(1, "Select a category"),
    categoryOther: z.string().optional(),
    estimatedVolume: z.enum(VOLUME_OPTIONS),
    photoUrl: z.string().nullable().optional(),
  })
  .refine(
    (data) => data.category !== "Other" || (data.categoryOther?.trim()?.length ?? 0) > 0,
    { message: "Please specify the category", path: ["categoryOther"] }
  );

export type ScoutReportFormValues = z.infer<typeof scoutReportSchema>;

const CATEGORIES: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "Cafe", label: "Cafe", Icon: Coffee },
  { id: "Retail", label: "Retail", Icon: ShoppingCart },
  { id: "Pharmacy", label: "Pharmacy", Icon: Pill },
  { id: "Fuel", label: "Fuel", Icon: Fuel },
  { id: "Other", label: "Other", Icon: ShoppingCart },
];

export interface ScoutReportFormProps {
  zoneId: string | null;
  zoneCode: string;
  /** When provided, new zones are created with this branch so they show in branch territory. */
  branchId?: string | null;
  /** Polygon for zone (used when creating zone). Optional if zoneId already exists. */
  coordinates?: Array<{ lat: number; lng: number }>;
  /** Fallback center when GPS unavailable */
  centerLat?: number;
  centerLng?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  /** When true, render compact (e.g. inside drawer) without full-page chrome */
  embedded?: boolean;
  /** When false, do not render the form's own header (e.g. page provides back link) */
  showHeader?: boolean;
}

export function ScoutReportForm({
  zoneId,
  zoneCode,
  branchId,
  coordinates = [],
  centerLat,
  centerLng,
  onSuccess,
  onCancel,
  embedded = false,
  showHeader = true,
}: ScoutReportFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<ScoutReportFormValues>({
    resolver: zodResolver(scoutReportSchema),
    defaultValues: {
      businessName: "",
      category: "",
      categoryOther: "",
      estimatedVolume: "MEDIUM",
      photoUrl: null,
    },
  });

  useEffect(() => {
    if (!navigator?.geolocation) {
      setGeoError("Geolocation not supported");
      if (centerLat != null && centerLng != null) {
        setGeo({ lat: centerLat, lng: centerLng });
      }
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setGeoError("Location blocked or unavailable");
        if (centerLat != null && centerLng != null) {
          setGeo({ lat: centerLat, lng: centerLng });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [centerLat, centerLng]);

  const photoUrl = form.watch("photoUrl");
  const hasPhoto = !!photoUrl;
  const category = form.watch("category");
  const isOtherCategory = category === "Other";

  async function onSubmit(values: ScoutReportFormValues) {
    const lat = geo?.lat ?? centerLat ?? 0;
    const lng = geo?.lng ?? centerLng ?? 0;
    setSubmitting(true);
    setSubmitError(null);

    const input: ScoutZoneInput = {
      zoneCode,
      coordinates: coordinates.length > 0 ? coordinates : [{ lat, lng }],
      zoneId: zoneId ?? undefined,
      branchId: branchId ?? undefined,
      businessName: values.businessName,
      category: values.category === "Other" ? (values.categoryOther?.trim() ?? "") : values.category,
      estimatedVolume: values.estimatedVolume,
      locationLat: lat,
      locationLng: lng,
      photoUrl: values.photoUrl ?? null,
    };

    const result = await createLead(input);
    setSubmitting(false);

    if (result.ok) {
      onSuccess?.();
    } else {
      setSubmitError(result.error ?? "Failed to save lead");
    }
  }

  const content = (
    <Form {...form}>
      <form
        id="scout-report-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-1 flex-col gap-6 p-4"
      >
        <input type="hidden" name="zoneId" value={zoneId ?? ""} />

        {!embedded && (
          <Card className="border-border bg-card text-card-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="font-mono text-sm font-medium text-muted-foreground">
                Zone & GPS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 font-mono text-sm">
              <p className="text-primary">{zoneCode}</p>
              <p className="text-muted-foreground">
                {geoError
                  ? `${geoError}${centerLat != null ? " (using zone center)" : ""}`
                  : geo
                    ? `GPS: ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`
                    : "Getting location…"}
              </p>
            </CardContent>
          </Card>
        )}

        {geoError && embedded && (
          <p className="text-muted-foreground text-xs">
            {geoError}
            {centerLat != null && " (using zone center)"}
          </p>
        )}

        <FormField
          control={form.control}
          name="businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Business Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="min-h-[44px] bg-card placeholder:text-muted-foreground"
                  placeholder="Enter business name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Business Category</FormLabel>
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
                          ? "border-cyan-700 bg-cyan-700 text-primary-foreground hover:bg-cyan-700/90"
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
                {isOtherCategory && (
                  <FormField
                    control={form.control}
                    name="categoryOther"
                    render={({ field }) => (
                      <FormItem className="mt-3">
                        <FormLabel className="text-foreground">Specify category</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="min-h-[44px] bg-card placeholder:text-muted-foreground"
                            placeholder="e.g. Bakery, Restaurant, Salon"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="estimatedVolume"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Estimated Daily Volume</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="min-h-[44px] w-full">
                    <SelectValue placeholder="Select volume" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {VOLUME_OPTIONS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="photoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Storefront Image</FormLabel>
              <FormControl>
                <input
                  ref={fileInputRef}
                  type="file"
                  capture="environment"
                  accept="image/*"
                  className="sr-only"
                  aria-hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => field.onChange(reader.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
              </FormControl>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                  "border-border hover:border-muted-foreground/50 hover:bg-muted/50",
                  hasPhoto && "border-cyan-700 bg-cyan-700/10"
                )}
              >
                <Camera
                  className={cn(
                    "size-12 shrink-0",
                    hasPhoto ? "text-cyan-700" : "text-muted-foreground"
                  )}
                  aria-hidden
                />
                <span className="font-mono text-sm text-muted-foreground">
                  {hasPhoto ? "Image captured" : "Tap to Capture Storefront Image"}
                </span>
              </button>
              <FormMessage />
            </FormItem>
          )}
        />

        {submitError && (
          <p className="text-destructive text-sm">{submitError}</p>
        )}

        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="min-h-[44px] flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            form="scout-report-form"
            className="min-h-[44px] flex-1"
            disabled={submitting}
          >
            {submitting ? "Saving…" : "TRANSMIT INTEL (+20 XP)"}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (embedded) {
    return <div className="flex flex-col gap-4">{content}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">
      {showHeader && (
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
          <h1 className="flex-1 font-mono text-lg font-semibold text-foreground">
            OP-01: RECON REPORT
          </h1>
        </header>
      )}
      {content}
      <div
        className="fixed left-0 right-0 z-40 border-t border-border bg-background p-4"
        style={{ bottom: "max(env(safe-area-inset-bottom, 0px), 5rem)" }}
      >
        <Button
          type="submit"
          form="scout-report-form"
          className="h-14 w-full text-lg font-bold"
          disabled={submitting}
        >
          {submitting ? "Saving…" : "TRANSMIT INTEL (+20 XP)"}
        </Button>
      </div>
    </div>
  );
}
