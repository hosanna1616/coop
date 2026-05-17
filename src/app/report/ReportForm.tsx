"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { submitDailyReport } from "@/app/actions/daily-report";

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function ReportForm() {
  const [reportDate, setReportDate] = useState(todayISO());
  const [planNotes, setPlanNotes] = useState("");
  const [closeoutNotes, setCloseoutNotes] = useState("");
  const [blockers, setBlockers] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await submitDailyReport({
        reportDate,
        content: content.trim(),
        planNotes: planNotes.trim() || null,
        closeoutNotes: closeoutNotes.trim() || null,
        blockers: blockers.trim() || null,
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Report submitted." });
        setPlanNotes("");
        setCloseoutNotes("");
        setBlockers("");
        setContent("");
      } else {
        setMessage({ type: "error", text: res.error ?? "Failed to submit." });
      }
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to submit.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    planNotes.trim().length > 0 ||
    closeoutNotes.trim().length > 0 ||
    content.trim().length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-center border-b border-border bg-background">
        <h1 className="font-mono text-lg font-semibold text-foreground">DAILY REPORT</h1>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4">
        <Card className="border-border bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="font-mono text-base">Daily field report</CardTitle>
            <p className="text-sm text-muted-foreground">
              Structured plan and closeout for your branch manager. Visible on the squad dashboard.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {message && (
                <p
                  className={
                    message.type === "success"
                      ? "text-sm text-green-600"
                      : "text-sm text-destructive"
                  }
                >
                  {message.text}
                </p>
              )}
              <div className="grid gap-2">
                <Label htmlFor="reportDate">Date</Label>
                <input
                  id="reportDate"
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="planNotes">Today&apos;s plan</Label>
                <textarea
                  id="planNotes"
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  placeholder="Areas to cover, targets…"
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="closeoutNotes">Closeout</Label>
                <textarea
                  id="closeoutNotes"
                  value={closeoutNotes}
                  onChange={(e) => setCloseoutNotes(e.target.value)}
                  placeholder="What you completed…"
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="blockers">Blockers (optional)</Label>
                <textarea
                  id="blockers"
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="Issues needing manager support…"
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content">Additional notes (optional)</Label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Extra details…"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                />
              </div>
              <Button type="submit" disabled={submitting || !canSubmit}>
                {submitting ? "Submitting…" : "Submit report"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
