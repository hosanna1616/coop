"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_PATH = "/images/Cooperative_Bank_of_Oromia.png";

const LINES = [
  "INITIALIZING SECURE CHANNEL",
  "VERIFYING CLEARANCE",
  "LOADING TERRITORY DATA",
  "SYSTEM CHECK IN PROGRESS",
];

export function PortalLoading({
  className,
  message,
}: {
  className?: string;
  message?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      {/* Subtle grid overlay - classified blueprint feel */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(var(--primary) 1px, transparent 1px),
            linear-gradient(90deg, var(--primary) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Scanline effect */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, var(--primary) 2px, var(--primary) 3px)",
        }}
      />

      {/* Radial vignette - darker edges */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, black 100%)",
        }}
      />

      {/* Center content card */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        {/* Logo / badge */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div
            className="absolute inset-0 rotate-45 rounded-lg border-2 border-primary/80 bg-black/90 shadow-[0_0_30px_var(--primary)]"
            style={{
              boxShadow:
                "0 0 40px -5px var(--primary), 0 0 0 1px var(--primary) inset",
            }}
          />
          <div
            className="relative flex h-14 w-14 shrink-0 items-center justify-center"
            style={{ transform: "rotate(-45deg)" }}
          >
            <Image
              src={LOGO_PATH}
              alt="Merchant Nation"
              width={56}
              height={56}
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Classified header */}
        <div className="text-center">
          <p className="font-mono text-[10px] tracking-[0.35em] text-primary/90 uppercase">
            Classified · Merchant Nation Command
          </p>
          <p className="mt-2 font-mono text-xs tracking-widest text-muted-foreground/80">
            {message ?? "Secure portal"}
          </p>
        </div>

        {/* Animated status lines */}
        <div className="flex flex-col gap-1 font-mono text-[11px] text-primary/70">
          {LINES.map((line, i) => (
            <div
              key={line}
              className="flex items-center gap-2"
              style={{
                animation: "portal-line 0.6s ease-out forwards",
                animationDelay: `${i * 0.12}s`,
                opacity: 0,
              }}
            >
              <span className="text-primary/50">&gt;</span>
              <span className="tracking-wider">{line}</span>
              <span className="animate-pulse text-primary">...</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-56 overflow-hidden rounded-sm border border-primary/40 bg-black/60">
          <div
            className="h-1.5 rounded-sm bg-primary/90 transition-[width] duration-500"
            style={{
              animation: "portal-progress 1.8s ease-in-out infinite",
              boxShadow: "0 0 12px var(--primary)",
            }}
          />
        </div>

        {/* Blinking cursor */}
        <p className="font-mono text-xs text-primary/80">
          <span className="animate-pulse">█</span>
        </p>
      </div>

      {/* Corner brackets - spy aesthetic */}
      <div className="pointer-events-none absolute left-4 top-4 h-12 w-12 border-l-2 border-t-2 border-primary/40" />
      <div className="pointer-events-none absolute right-4 top-4 h-12 w-12 border-r-2 border-t-2 border-primary/40" />
      <div className="pointer-events-none absolute bottom-4 left-4 h-12 w-12 border-b-2 border-l-2 border-primary/40" />
      <div className="pointer-events-none absolute bottom-4 right-4 h-12 w-12 border-b-2 border-r-2 border-primary/40" />
    </div>
  );
}

/** Inline / small version for sections (e.g. map, tables) */
export function PortalLoadingInline({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-primary/20 bg-black/80 py-8 font-mono",
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
        <Image
          src={LOGO_PATH}
          alt=""
          width={40}
          height={40}
          className="animate-pulse object-contain opacity-90"
        />
      </div>
      <p className="text-[10px] tracking-widest text-primary/80 uppercase">
        Loading secure channel
      </p>
      <div className="h-0.5 w-24 overflow-hidden rounded-full bg-primary/20">
        <div
          className="h-full w-1/3 rounded-full bg-primary"
          style={{ animation: "portal-progress 1.2s ease-in-out infinite" }}
        />
      </div>
    </div>
  );
}
