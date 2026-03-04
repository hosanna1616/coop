"use client";

import { useState, useEffect } from "react";
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
import { scoutZone, type ScoutZoneInput } from "@/app/actions/leads";
import type { SelectedZone } from "./types";

const categories = ["Cafe", "Retail", "Kiosk"] as const;
const volumeOptions = ["LOW", "MEDIUM", "HIGH"] as const;

const scoutFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  category: z.enum(categories),
  estimatedVolume: z.enum(volumeOptions),
  photoUrl: z.string().nullable().optional(),
});

type ScoutFormValues = z.infer<typeof scoutFormSchema>;

export function ScoutForm({
  selected,
  onClose,
  onSuccess,
}: {
  selected: SelectedZone;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<ScoutFormValues>({
    resolver: zodResolver(scoutFormSchema),
    defaultValues: {
      businessName: "",
      category: "Retail",
      estimatedVolume: "MEDIUM",
      photoUrl: null,
    },
  });

  useEffect(() => {
    if (!navigator?.geolocation) {
      setGeoError("Geolocation not supported");
      setGeo({ lat: selected.cell.centerLat, lng: selected.cell.centerLng });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setGeoError("Location blocked or unavailable");
        setGeo({ lat: selected.cell.centerLat, lng: selected.cell.centerLng });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [selected.cell.centerLat, selected.cell.centerLng]);

  async function onSubmit(values: ScoutFormValues) {
    setSubmitting(true);
    setSubmitError(null);
    const lat = geo?.lat ?? selected.cell.centerLat;
    const lng = geo?.lng ?? selected.cell.centerLng;
    const input: ScoutZoneInput = {
      zoneCode: selected.cell.code,
      coordinates: selected.cell.polygon,
      zoneId: selected.zone?.id ?? null,
      businessName: values.businessName,
      category: values.category,
      estimatedVolume: values.estimatedVolume,
      locationLat: lat,
      locationLng: lng,
      photoUrl: values.photoUrl ?? null,
    };
    const result = await scoutZone(input);
    setSubmitting(false);
    if (result.ok) {
      onSuccess();
    } else {
      setSubmitError(result.error ?? "Failed to save lead");
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-semibold">Scout this zone</h2>
      {geoError && (
        <p className="text-muted-foreground text-sm">{geoError} (using zone center)</p>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="businessName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Joe's Cafe"
                    className="min-h-[44px]"
                    {...field}
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
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="min-h-[44px] w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
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
            name="estimatedVolume"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated daily volume</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="min-h-[44px] w-full">
                      <SelectValue placeholder="Select volume" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {volumeOptions.map((v) => (
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
          <div className="grid gap-2">
            <FormLabel>Photo (optional)</FormLabel>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="min-h-[44px] w-full text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground file:text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  form.setValue("photoUrl", reader.result as string);
                };
                reader.readAsDataURL(file);
              }}
            />
            <p className="text-muted-foreground text-xs">
              Capture with camera; stored as placeholder for now.
            </p>
          </div>
          {submitError && (
            <p className="text-destructive text-sm">{submitError}</p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-h-[44px] flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="min-h-[44px] flex-1"
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Save lead (+20 XP)"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
