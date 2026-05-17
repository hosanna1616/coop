/**
 * Smoke test for field-operations date helpers (no DB).
 * Run: node scripts/test-field-operations.mjs
 */

function startOfWeekMonday(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

function isWorkOrderOverdue(dueAt, status) {
  if (status === "COMPLETED" || status === "CANCELLED") return false;
  return dueAt.getTime() < Date.now();
}

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

const monday = startOfWeekMonday(new Date("2026-05-17T12:00:00Z"));
assert(monday.getUTCDay() === 1, "week start should be Monday");

const future = new Date(Date.now() + 86400000);
assert(!isWorkOrderOverdue(future, "PENDING"), "future not overdue");
const past = new Date(Date.now() - 86400000);
assert(isWorkOrderOverdue(past, "PENDING"), "past is overdue");
assert(!isWorkOrderOverdue(past, "COMPLETED"), "completed not overdue");

console.log("OK: field-operations helpers");
