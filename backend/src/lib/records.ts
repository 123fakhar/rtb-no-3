import { Prisma } from "@prisma/client";
import { periodStart } from "./pkt";

/** Rows copied from the sales workbook. They are sales, not CRM decisions. */
export const salesBookWhere: Prisma.CrmEntryWhereInput = {
  kind: "SALE",
  pingId: null,
  buyerId: null,
  status: "APPROVED",
};

/** CRM forms a person submitted or a manager reviewed. Buyer blocks stay out. */
export const crmReviewWhere: Prisma.CrmEntryWhereInput = {
  kind: "SALE",
  NOT: [{ pingId: "sheet-import" }, salesBookWhere],
};

export const recordedSaleWhere: Prisma.CrmEntryWhereInput = {
  OR: [salesBookWhere, { AND: [crmReviewWhere, { status: "APPROVED" }] }],
};

/** No-pickup workbook rows. They count as rejected history, not as new sales. */
export const noPickupWhere: Prisma.CrmEntryWhereInput = {
  pingId: "sheet-import",
  kind: "SALE",
  status: "REJECTED",
};

/** Sales sheet, CRM reviews, and no-pickup rejections. Buyer-level sold blocks stay out. */
export function portalStatsWhere(from: Date | null): Prisma.CrmEntryWhereInput {
  const history: Prisma.CrmEntryWhereInput = {
    kind: "SALE",
    OR: [{ pingId: null }, { pingId: { not: "sheet-import" } }, noPickupWhere],
  };
  if (!from) return history;
  return {
    AND: [
      history,
      {
        OR: [
          { pingId: null, createdAt: { gte: from } },
          { pingId: { not: "sheet-import" }, createdAt: { gte: from } },
          { pingId: "sheet-import", status: "REJECTED", reportedAt: { gte: from } },
        ],
      },
    ],
  };
}

export function isNoPickup(entry: { pingId?: string | null; status: string }) {
  return entry.pingId === "sheet-import" && entry.status === "REJECTED";
}

export function isSalesBook(entry: { pingId?: string | null; buyerId?: string | null; status: string }) {
  return entry.pingId == null && entry.buyerId == null && entry.status === "APPROVED";
}

export function personKey(value: string | null | undefined) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** A record belongs to a current account when that account submitted it or the sheet used the same name. */
export function recordBelongsTo(
  entry: { agentId?: string | null; closerName?: string | null; fronterName?: string | null },
  user: { id: string; name: string }
) {
  if (entry.agentId === user.id) return true;
  const key = personKey(user.name);
  if (key.length < 3) return false;
  return personKey(entry.closerName) === key || personKey(entry.fronterName) === key;
}

const SKIP_NAMES = new Set(["sheetimport", "unknown", "unknownagent", "agentname", "na", "none", "closer", "agent"]);

export function displayName(value: string | null | undefined) {
  const name = String(value || "").replace(/\s+/g, " ").trim();
  const key = personKey(name);
  if (key.length < 3 || SKIP_NAMES.has(key)) return null;
  return { key, name };
}

export function entryWhen(entry: { pingId?: string | null; createdAt: Date; reportedAt?: Date | null }) {
  return entry.pingId === "sheet-import" ? entry.reportedAt ?? null : entry.createdAt;
}

/** The business day that started 14 Pakistan days ago, at 6:00 PM. */
export function twoWeekStart(now = new Date()) {
  return new Date(periodStart("day", now).getTime() - 14 * 24 * 60 * 60 * 1000);
}

type HistoryRow = {
  fronterName?: string | null;
  closerName?: string | null;
  status: string;
  pingId?: string | null;
  createdAt: Date;
  reportedAt?: Date | null;
};

export type PersonStat = {
  name: string;
  email: string;
  pending: number;
  approved: number;
  rejected: number;
  total: number;
};

function statusOf(status: string): "pending" | "approved" | "rejected" {
  if (status === "PENDING") return "pending";
  if (status === "REJECTED") return "rejected";
  return "approved";
}

/**
 * Names that appear on the sheets during the past two weeks.
 * Each name then receives every earlier sheet row under that same name.
 */
export function rosterFromHistory(entries: HistoryRow[], now = new Date()) {
  const start = twoWeekStart(now);
  const agentNames = new Map<string, string>();
  const closerNames = new Map<string, string>();
  for (const entry of entries) {
    const when = entryWhen(entry);
    if (!when || when < start) continue;
    const agent = displayName(entry.fronterName);
    const closer = displayName(entry.closerName);
    if (agent) agentNames.set(agent.key, agent.name);
    if (closer) closerNames.set(closer.key, closer.name);
  }

  const tally = (names: Map<string, string>): PersonStat[] => {
    const buckets = new Map<string, PersonStat>(
      [...names.entries()].map(([key, name]) => [key, { name, email: "", pending: 0, approved: 0, rejected: 0, total: 0 }])
    );
    for (const entry of entries) {
      const matched = new Set<string>();
      for (const value of [entry.fronterName, entry.closerName]) {
        const who = displayName(value);
        if (who && buckets.has(who.key)) matched.add(who.key);
      }
      if (matched.size === 0) continue;
      const status = statusOf(entry.status);
      for (const key of matched) {
        const bucket = buckets.get(key)!;
        bucket[status] += 1;
        bucket.total += 1;
      }
    }
    return [...buckets.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  };

  return { agents: tally(agentNames), closers: tally(closerNames) };
}
