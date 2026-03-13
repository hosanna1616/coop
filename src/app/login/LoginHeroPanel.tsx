"use client";

import { useState, useEffect, useRef } from "react";

const MESSAGES = [
  {
    tagline: "COOPERATIVE BANK OF OROMIA",
    headline: "FIELD OPERATIONS & BRANCH MANAGEMENT.",
    description:
      "Scout zones, onboard merchants, and execute missions from a single platform. Performance is tracked and ranked, as in a military expedition—drive results and rise.",
    quote: "Growth through cooperation.",
  },
  {
    tagline: "MERCHANT NATION COMMAND",
    headline: "TERRITORY, MISSIONS, AND REPORTS.",
    description:
      "Monitor zones at risk, assign tasks, and view activity across branches. Contributors are ranked by performance; excellence is measured and recognized.",
    quote: "One command. Every branch.",
  },
  {
    tagline: "BUILT FOR THE FIELD",
    headline: "SCOUT TO REPORT, WITHOUT SWITCHING TOOLS.",
    description:
      "Capture leads, induct merchants, and submit reports in one flow. Your output is tracked and ranked—treat each mission like an expedition and perform accordingly.",
    quote: "Move fast. Stay coordinated.",
  },
  {
    tagline: "COOPERATIVE BANK OF OROMIA",
    headline: "ADMIN, MANAGERS, AND STAFF—ALIGNED.",
    description:
      "Admins oversee all branches; managers run their unit; staff execute missions. Performance-based ranking applies at every level—excellence is visible and rewarded.",
    quote: "Growth through cooperation.",
  },
];

const ROTATION_MS = 8000;
const TYPING_DELAY_MS = 75;
const CURSOR_CHAR = "▌";

function useTypingAnimation(text: string, key: number, delayMs: number) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedLength(0);
    setIsComplete(false);
  }, [key]);

  useEffect(() => {
    if (displayedLength >= text.length) {
      setIsComplete(true);
      return;
    }
    const t = setTimeout(() => {
      setDisplayedLength((n) => Math.min(n + 1, text.length));
    }, delayMs);
    return () => clearTimeout(t);
  }, [text, displayedLength, delayMs]);

  return { displayed: text.slice(0, displayedLength), isComplete };
}

export function LoginHeroPanel() {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const msg = MESSAGES[index];
  const { displayed: descriptionDisplayed, isComplete } = useTypingAnimation(
    msg.description,
    index,
    TYPING_DELAY_MS
  );

  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length);
    }, ROTATION_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused]);

  return (
    <div
      className="relative flex flex-col justify-center text-center md:max-w-md md:text-left"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {/* Military-style panel: border frame + scanline */}
      <div className="relative overflow-hidden rounded border-2 border-primary/50 bg-card/80 py-5 pl-5 pr-5 shadow-lg ring-1 ring-primary/20 md:py-6 md:pl-6 md:pr-6">
        {/* Subtle grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(var(--primary) 1px, transparent 1px),
              linear-gradient(90deg, var(--primary) 1px, transparent 1px)
            `,
            backgroundSize: "12px 12px",
          }}
          aria-hidden
        />
        {/* Corner brackets */}
        <div className="pointer-events-none absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-primary/60" />
        <div className="pointer-events-none absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-primary/60" />
        <div className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-primary/60" />
        <div className="pointer-events-none absolute right-2 bottom-2 h-4 w-4 border-b-2 border-r-2 border-primary/60" />

        {/* Secure access badge */}
        <div className="relative mb-4 flex items-center gap-2 md:mb-5">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-primary">
            Secure access
          </span>
          <span className="h-px flex-1 max-w-12 bg-primary/30" aria-hidden />
        </div>

        <div key={index} className="relative animate-hero-enter overflow-hidden">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary/90 animate-hero-line">
            {msg.tagline}
          </p>
          <h2
            className="mt-3 font-mono text-lg font-bold leading-tight tracking-tight text-foreground md:mt-4 md:text-xl animate-hero-line"
            style={{ animationDelay: "120ms" }}
          >
            {msg.headline}
          </h2>

          {/* Live typing description */}
          <p
            className="mt-3 min-h-[3.5rem] font-mono text-sm leading-relaxed text-muted-foreground md:mt-4 md:text-base animate-hero-line"
            style={{ animationDelay: "200ms" }}
          >
            <span>{descriptionDisplayed}</span>
            {!isComplete && (
              <span
                className="typing-cursor ml-0.5 inline-block text-primary"
                aria-hidden
              >
                {CURSOR_CHAR}
              </span>
            )}
          </p>

          <blockquote
            className="mt-5 border-l-2 border-primary/50 pl-3 font-mono text-xs italic text-foreground/80 md:mt-6 md:pl-4 animate-hero-line"
            style={{ animationDelay: "280ms" }}
          >
            &ldquo;{msg.quote}&rdquo;
          </blockquote>
        </div>
      </div>
    </div>
  );
}
