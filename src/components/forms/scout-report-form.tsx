"use client";

import { useRef, useState, useEffect } from "react";
import {
  Coffee,
  ShoppingCart,
  Pill,
  Fuel,
  Camera,
  Store,
  UtensilsCrossed,
  Building2,
  Banknote,
  Shirt,
  Car,
  MapPin,
  Smartphone,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createLead, type ScoutZoneInput } from "@/app/actions/leads";
import { getScoutCategories } from "@/app/actions/scout-categories";
import { getExternalBanks } from "@/app/actions/external-banks";
import { PortalLoadingInline } from "@/components/ui/portal-loading";

const VOLUME_OPTIONS = ["LOW", "MEDIUM", "HIGH"] as const;

const scoutReportSchema = z
  .object({
    businessName: z.string().min(1, "Business name is required"),
    category: z.string().min(1, "Select a category"),
    categoryOther: z.string().optional(),
    estimatedVolume: z.enum(VOLUME_OPTIONS),
    // Keep this required in the schema so `zodResolver` and `useForm` agree on `externalBankIds: string[]`.
    externalBankIds: z.array(z.string()),
    photoUrl: z.string().nullable().optional(),
  })
  .refine(
    (data) => data.category !== "Other" || (data.categoryOther?.trim()?.length ?? 0) > 0,
    { message: "Please specify the category", path: ["categoryOther"] }
  );

export type ScoutReportFormValues = z.infer<typeof scoutReportSchema>;

const ICON_MAP: Record<string, LucideIcon> = {
  Coffee,
  ShoppingCart,
  Pill,
  Fuel,
  Store,
  UtensilsCrossed,
  Building2,
  Banknote,
  Camera,
  Shirt,
  Car,
  Other: ShoppingCart,
};

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
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [locationChoice, setLocationChoice] = useState<"device" | "map" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof getScoutCategories>>>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [externalBanks, setExternalBanks] = useState<Awaited<ReturnType<typeof getExternalBanks>>>([]);
  const [externalBanksLoading, setExternalBanksLoading] = useState(true);
  const [banksDropdownOpen, setBanksDropdownOpen] = useState(false);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [showBadgePopup, setShowBadgePopup] = useState(false);

  const mapCenter =
    centerLat != null && centerLng != null
      ? { lat: centerLat, lng: centerLng }
      : coordinates.length > 0
        ? {
            lat: coordinates.reduce((s, p) => s + p.lat, 0) / coordinates.length,
            lng: coordinates.reduce((s, p) => s + p.lng, 0) / coordinates.length,
          }
        : null;

  useEffect(() => {
    // Default to map-selected location so players can submit without extra taps.
    if (mapCenter && locationChoice === null && geo == null) {
      setLocationChoice("map");
      setGeo(mapCenter);
    }
  }, [mapCenter, locationChoice, geo]);

  useEffect(() => {
    getScoutCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, []);

  useEffect(() => {
    getExternalBanks()
      .then(setExternalBanks)
      .catch(() => setExternalBanks([]))
      .finally(() => setExternalBanksLoading(false));
  }, []);

  const requestDeviceLocation = () => {
    setLocationChoice("device");
    setGeoError(null);
    setLoadingGeo(true);
    if (!navigator?.geolocation) {
      setGeoError("Geolocation not supported");
      setLoadingGeo(false);
      if (mapCenter) setGeo(mapCenter);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoadingGeo(false);
      },
      () => {
        setGeoError("Location blocked or unavailable");
        setLoadingGeo(false);
        if (mapCenter) setGeo(mapCenter);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const selectMapLocation = () => {
    setLocationChoice("map");
    setGeoError(null);
    if (mapCenter) setGeo(mapCenter);
  };

  const form = useForm<ScoutReportFormValues>({
    resolver: zodResolver(scoutReportSchema),
    defaultValues: {
      businessName: "",
      category: "",
      categoryOther: "",
      estimatedVolume: "MEDIUM",
      externalBankIds: [],
      photoUrl: null,
    },
  });

  const photoUrl = form.watch("photoUrl");
  const hasPhoto = !!photoUrl;
  const category = form.watch("category");
  const selectedExternalBankIds = form.watch("externalBankIds");
  const isOtherCategory = category === "Other";
  const categoryOptions = [
    ...categories
      .filter((c) => c.name !== "Other")
      .map((c) => ({
        id: c.name,
        label: c.displayName,
        Icon: (ICON_MAP[c.iconName ?? ""] ?? ShoppingCart) as LucideIcon,
      })),
    { id: "Other", label: "Other", Icon: ShoppingCart as LucideIcon },
  ];

  async function onSubmit(values: ScoutReportFormValues) {
    const lat = geo?.lat ?? mapCenter?.lat ?? centerLat ?? 0;
    const lng = geo?.lng ?? mapCenter?.lng ?? centerLng ?? 0;
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
      externalBankIds: values.externalBankIds,
      locationLat: lat,
      locationLng: lng,
      photoUrl: values.photoUrl ?? null,
    };

    const result = await createLead(input);
    setSubmitting(false);

    if (result.ok) {
      const unlocked = result.unlockedBadges ?? [];
      if (unlocked.length > 0) {
        setUnlockedBadges(unlocked);
        setShowBadgePopup(true);
      } else {
        onSuccess?.();
      }
    } else {
      setSubmitError(result.error ?? "Failed to save lead");
    }
  }

  const badgeLabel = (code: string) => {
    if (code === "STREAK_7") return "Scout Cadet unlocked";
    if (code === "STREAK_14") return "Scout Officer unlocked";
    return `${code} unlocked`;
  };

  const hasLocation =
    locationChoice === "map" && mapCenter
      ? true
      : locationChoice === "device" && geo != null && !loadingGeo;
  const locationBlockingSubmit = !hasLocation;

  const content = (
    <Form {...form}>
      <form
        id="scout-report-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-1 flex-col gap-6 p-4"
      >
        <input type="hidden" name="zoneId" value={zoneId ?? ""} />

        <div className="space-y-3">
          <p className="font-medium text-foreground">Merchant location</p>
          <p className="text-muted-foreground text-xs">
            Where is this merchant? This will be shown on the map.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-auto flex-col items-start gap-1 p-4 text-left",
                locationChoice === "map" && "border-primary ring-2 ring-primary"
              )}
              onClick={selectMapLocation}
              disabled={!mapCenter}
            >
              <span className="flex items-center gap-2 font-medium">
                <MapPin className="size-4 shrink-0" />
                Use location from the map
              </span>
              <span className="text-muted-foreground text-xs font-normal">
                The place I pressed on the map (this cell/zone)
              </span>
              {locationChoice === "map" && geo && (
                <span className="mt-1 font-mono text-xs">
                  {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
                </span>
              )}
              {!mapCenter && (
                <span className="mt-1 text-muted-foreground text-xs">Map center not available</span>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-auto flex-col items-start gap-1 p-4 text-left",
                locationChoice === "device" && "border-primary ring-2 ring-primary"
              )}
              onClick={requestDeviceLocation}
              disabled={loadingGeo}
            >
              <span className="flex items-center gap-2 font-medium">
                <Smartphone className="size-4 shrink-0" />
                Use my current location
              </span>
              <span className="text-muted-foreground text-xs font-normal">
                GPS from this device right now
              </span>
              {loadingGeo && (
                <span className="mt-1 text-muted-foreground text-xs">Getting location…</span>
              )}
              {locationChoice === "device" && geo && !loadingGeo && (
                <span className="mt-1 font-mono text-xs">
                  {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
                </span>
              )}
            </Button>
          </div>
          {geoError && <p className="text-destructive text-xs">{geoError}</p>}
          {!embedded && zoneCode && (
            <p className="font-mono text-xs text-muted-foreground">Zone: {zoneCode}</p>
          )}
        </div>

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
                {categoriesLoading ? (
                  <div className="min-h-[52px]">
                    <PortalLoadingInline className="min-h-[52px]" />
                  </div>
                ) : categoryOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No categories configured. Ask an admin to add Scout Categories.
                  </p>
                ) : (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="category"
                      className="min-h-[48px] w-full font-mono"
                      aria-label="Business category"
                    >
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map(({ id, label, Icon }) => (
                        <SelectItem key={id} value={id} className="font-mono">
                          <span className="flex items-center gap-2">
                            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                            {label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormControl>
              {isOtherCategory && (
                <FormField
                  control={form.control}
                  name="categoryOther"
                  render={({ field: otherField }) => (
                    <FormItem className="mt-3">
                      <FormLabel className="text-foreground">Specify category</FormLabel>
                      <FormControl>
                        <Input
                          {...otherField}
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
          name="externalBankIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Other services used</FormLabel>
              {externalBanksLoading ? (
                <div className="min-h-[52px]">
                  <PortalLoadingInline className="min-h-[52px]" />
                </div>
              ) : externalBanks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No other services configured. Ask an admin to add Other Services.
                </p>
              ) : (
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px] w-full justify-between font-normal"
                    onClick={() => setBanksDropdownOpen((prev) => !prev)}
                  >
                    <span className="truncate text-left">
                      {field.value.length > 0
                        ? `${field.value.length} selected`
                        : "Select one or more services"}
                    </span>
                    <span className="text-xs text-muted-foreground">▼</span>
                  </Button>
                  {banksDropdownOpen && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-background p-2 shadow-lg">
                      {externalBanks.map((bank) => {
                        const checked = field.value.includes(bank.id);
                        return (
                          <label
                            key={bank.id}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  field.onChange([...field.value, bank.id]);
                                } else {
                                  field.onChange(
                                    field.value.filter((id) => id !== bank.id)
                                  );
                                }
                              }}
                              className="h-4 w-4 rounded border-border"
                            />
                            <span className="font-mono">{bank.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {selectedExternalBankIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedExternalBankIds
                    .map((id) => externalBanks.find((b) => b.id === id)?.name)
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
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
              <div className="space-y-3">
                {hasPhoto ? (
                  <>
                    <div className="relative overflow-hidden rounded-lg border-2 border-border bg-muted">
                      <img
                        src={photoUrl ?? undefined}
                        alt="Storefront"
                        className="block max-h-64 w-full object-contain"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="font-mono"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Change photo
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="font-mono text-muted-foreground"
                        onClick={() => field.onChange(null)}
                      >
                        Remove
                      </Button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                      "border-border hover:border-muted-foreground/50 hover:bg-muted/50"
                    )}
                  >
                    <Camera
                      className="size-12 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="font-mono text-sm text-muted-foreground">
                      Tap to Capture Storefront Image
                    </span>
                  </button>
                )}
              </div>
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
            disabled={submitting || categoriesLoading || categoryOptions.length === 0 || locationBlockingSubmit}
          >
            {submitting ? "Saving…" : "TRANSMIT INTEL (+20 XP)"}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (embedded) {
    return (
      <div className="flex flex-col gap-4">
        {content}
        <Dialog open={showBadgePopup} onOpenChange={setShowBadgePopup}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-mono">Badge Unlocked</DialogTitle>
              <DialogDescription>
                Great scout report. You unlocked new badge rewards.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {unlockedBadges.map((code) => (
                <div key={code} className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 font-mono text-sm text-green-300">
                  {badgeLabel(code)}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                className="font-mono"
                onClick={() => {
                  setShowBadgePopup(false);
                  onSuccess?.();
                }}
              >
                Awesome
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
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
      <Dialog open={showBadgePopup} onOpenChange={setShowBadgePopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">Badge Unlocked</DialogTitle>
            <DialogDescription>
              Great scout report. You unlocked new badge rewards.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {unlockedBadges.map((code) => (
              <div key={code} className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 font-mono text-sm text-green-300">
                {badgeLabel(code)}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              className="font-mono"
              onClick={() => {
                setShowBadgePopup(false);
                onSuccess?.();
              }}
            >
              Awesome
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div
        className="fixed left-0 right-0 z-40 border-t border-border bg-background p-4"
        style={{ bottom: "max(env(safe-area-inset-bottom, 0px), 5rem)" }}
      >
        <Button
          type="submit"
          form="scout-report-form"
          className="h-14 w-full text-lg font-bold"
          disabled={submitting || categoriesLoading || categoryOptions.length === 0 || locationBlockingSubmit}
        >
          {submitting ? "Saving…" : "TRANSMIT INTEL (+20 XP)"}
        </Button>
      </div>
    </div>
  );
}
