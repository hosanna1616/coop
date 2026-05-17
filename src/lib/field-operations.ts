/** Monday 00:00 UTC for the week containing `d`. */
export function startOfWeekMonday(d = new Date()): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

export function endOfWeekSunday(weekStart: Date): Date {
  const end = new Date(weekStart);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

export function weekStartISO(d = new Date()): string {
  return startOfWeekMonday(d).toISOString().slice(0, 10);
}

export const SLA_LEAD_TO_INDUCT_DAYS = 7;
export const SLA_DEPLOYMENT_DAYS = 14;

export function isWorkOrderOverdue(dueAt: Date, status: string): boolean {
  if (status === "COMPLETED" || status === "CANCELLED") return false;
  return dueAt.getTime() < Date.now();
}

export const WORK_ORDER_OBJECTIVE_LABELS: Record<string, string> = {
  SCOUT: "Scout territory",
  INDUCT: "Induct merchant",
  DEPLOY: "Complete deployment",
  REVISIT: "Revisit lead",
  GENERAL: "General task",
};
