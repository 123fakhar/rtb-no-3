import type { BuiltRequest, ProviderAdapter, ProviderContext, ProviderResult } from "./types";
import { applyTokens, e164Phone, postalCode, resolvedParams, tenDigitPhone, withQuery } from "./url";

type Interpret = ProviderAdapter["interpret"];

/**
 * Generic RTB adapter used by providers that speak a simple
 * "URL + query params, JSON response" protocol. Provider-specific
 * adapters override `buildRequest` / `interpret` where the wire format differs.
 */
export function createGenericAdapter(opts: {
  key: string;
  label: string;
  fields?: ProviderAdapter["fields"];
  apiKeyParam?: string;
  interpret?: Interpret;
}): ProviderAdapter {
  return {
    key: opts.key,
    label: opts.label,
    fields: opts.fields ?? [],
    buildRequest(ctx: ProviderContext): BuiltRequest {
      const pairs = resolvedParams(ctx).filter(
        (pair) => pair.value && !pair.value.includes("{") && pair.value !== "undefined"
      );
      const has = (key: string) => pairs.some((pair) => pair.key.toLowerCase() === key.toLowerCase());
      const extraValue = (...keys: string[]) => {
        for (const key of keys) {
          const value = ctx.extra[key];
          if (typeof value === "string" && value.trim()) return value.trim();
        }
        return "";
      };

      if (ctx.provider === "trackdrive") {
        const trafficSourceId = extraValue("trafficSourceId", "publisherId");
        if (trafficSourceId && !has("traffic_source_id")) {
          pairs.push({ key: "traffic_source_id", value: trafficSourceId });
        }
        const trackdriveNumber = extraValue("trackdriveNumber", "providerCampaignId").replace(/\D/g, "");
        if (trackdriveNumber && !has("trackdrive_number")) {
          pairs.push({ key: "trackdrive_number", value: trackdriveNumber });
        }
        const postal = postalCode(ctx.lead.zip);
        const state = ctx.lead.state && ctx.lead.state !== "undefined" ? ctx.lead.state.trim().toUpperCase() : "";
        if (postal && !has("caller_zip")) pairs.push({ key: "caller_zip", value: postal });
        if (postal && !has("zip")) pairs.push({ key: "zip", value: postal });
        if (state && !has("caller_state")) pairs.push({ key: "caller_state", value: state });
        if (state && !has("state")) pairs.push({ key: "state", value: state });
        const caller = tenDigitPhone(ctx.lead.phone);
        if (caller.length === 10) {
          const callerNumber = pairs.findIndex((pair) => pair.key.toLowerCase() === "caller_number");
          if (callerNumber >= 0) pairs[callerNumber] = { key: "caller_number", value: caller };
          else pairs.push({ key: "caller_number", value: caller });
          const callerId = pairs.findIndex((pair) => pair.key.toLowerCase() === "caller_id");
          if (callerId >= 0) pairs[callerId] = { key: "caller_id", value: caller };
          else pairs.push({ key: "caller_id", value: caller });
        }
      }

      if (ctx.provider === "intelhouse") {
        const publisherId = extraValue("publisherId");
        const campaignId = extraValue("providerCampaignId", "campaignId");
        if (publisherId && !has("publisher_id")) pairs.push({ key: "publisher_id", value: publisherId });
        if (campaignId && !has("campaign_id")) pairs.push({ key: "campaign_id", value: campaignId });
      }

      if (ctx.provider === "ringfuel") {
        const campaignKey = extraValue("campaignKey", "providerCampaignId");
        if (campaignKey && !has("campaign_key")) pairs.push({ key: "campaign_key", value: campaignKey });
        if (campaignKey && !has("campaignId")) pairs.push({ key: "campaignId", value: campaignKey });
      }

      if (ctx.provider === "callisto") {
        const caller = e164Phone(ctx.lead.phone);
        const state = ctx.lead.state && ctx.lead.state !== "undefined" ? ctx.lead.state.trim().toUpperCase() : "";
        const postal = postalCode(ctx.lead.zip);
        const setPair = (key: string, value: string) => {
          if (!value) return;
          const index = pairs.findIndex((pair) => pair.key.toLowerCase() === key);
          if (index >= 0) pairs[index] = { key, value };
          else pairs.push({ key, value });
        };
        setPair("caller_id", caller);
        setPair("state", state);
        setPair("zip", postal);
      }

      if (ctx.provider === "ringba") {
        const caller = e164Phone(ctx.lead.phone);
        const cidIndex = pairs.findIndex((pair) => pair.key.toLowerCase() === "cid");
        if (caller) {
          if (cidIndex >= 0) pairs[cidIndex] = { key: "CID", value: caller };
          else pairs.push({ key: "CID", value: caller });
        }
        const postal = postalCode(ctx.lead.zip);
        if (postal && !has("zipcode")) pairs.push({ key: "zipcode", value: postal });
        if (!has("exposecallerid")) pairs.push({ key: "exposecallerid", value: "Yes" });
        const ten = tenDigitPhone(ctx.lead.phone);
        if (ten && !has("caller_number")) pairs.push({ key: "caller_number", value: ten });
      }

      if (ctx.provider === "moja") {
        const closed = mojaClosedReason(ctx.extra);
        if (closed) throw new Error(closed);
        const caller = tenDigitPhone(ctx.lead.phone);
        const callerId = caller.length === 10 ? `1${caller}` : caller;
        const zip = postalCode(ctx.lead.zip);
        const state = ctx.lead.state && ctx.lead.state !== "undefined" ? ctx.lead.state.trim().toUpperCase() : "";
        pairs.length = 0;
        if (callerId) pairs.push({ key: "CALLER_ID", value: callerId });
        if (zip) {
          pairs.push({ key: "caller_zip", value: zip });
          pairs.push({ key: "ZIP_CODE", value: zip });
        }
        if (state) pairs.push({ key: "CALLER_STATE", value: state });
      }

      if (ctx.provider === "retreaver") {
        const publisherId = extraValue("publisherId");
        if (publisherId && !has("publisher_id")) pairs.push({ key: "publisher_id", value: publisherId });
        // Retreaver matches this publisher on an 11-digit caller number. Buyers with no publisher id keep the 10-digit number already in use.
        const caller = tenDigitPhone(ctx.lead.phone);
        if (publisherId && caller.length === 10) {
          const index = pairs.findIndex((pair) => pair.key.toLowerCase() === "caller_number");
          const value = `1${caller}`;
          if (index >= 0) pairs[index] = { key: "caller_number", value };
          else pairs.push({ key: "caller_number", value });
        }
      }

      if (opts.apiKeyParam && ctx.apiKey && !has(opts.apiKeyParam)) {
        pairs.push({ key: opts.apiKeyParam, value: ctx.apiKey });
      }

      if (ctx.provider === "intelhouse") {
        const allowed = new Set(["caller_number", "caller_zip", "publisher_id", "campaign_id"]);
        for (let i = pairs.length - 1; i >= 0; i -= 1) {
          if (!allowed.has(pairs[i].key)) pairs.splice(i, 1);
        }
      }

      if (ctx.provider === "nextgen") {
        const caller = tenDigitPhone(ctx.lead.phone);
        const state = ctx.lead.state && ctx.lead.state !== "undefined" ? ctx.lead.state.trim().toUpperCase() : "";
        let raw = ctx.baseUrl;
        try {
          raw = decodeURI(ctx.baseUrl);
        } catch {
          raw = ctx.baseUrl;
        }
        const url = new URL(applyTokens(raw, ctx.lead));
        const parts = url.pathname.split("/").filter(Boolean);
        const pingAt = parts.lastIndexOf("ping");
        if (pingAt >= 0 && parts[pingAt + 1] && caller.length === 10) {
          url.pathname = `/${parts.slice(0, pingAt + 2).concat(caller).join("/")}`;
        }
        if (state) url.searchParams.set("state", state);
        return { url: url.toString(), method: "GET", headers: { ...ctx.headers } };
      }

      if (ctx.provider === "callgrid") {
        const caller = e164Phone(ctx.lead.phone);
        const postal = postalCode(ctx.lead.zip);
        const configuredSub = pairs.find((pair) => pair.key === "SubPublisherid")?.value || "";
        const sub = configuredSub || extraValue("publisherId", "subPublisherId") || "Seagulls";
        const pstn = pairs.find((pair) => pair.key.toLowerCase() === "pstn")?.value || "true";
        pairs.length = 0;
        if (caller) pairs.push({ key: "CallerId", value: caller });
        if (postal) pairs.push({ key: "InboundZipCode", value: postal });
        if (sub) pairs.push({ key: "SubPublisherid", value: sub });
        if (pstn) pairs.push({ key: "pstn", value: pstn });
      }
      // Reference buyers are called with the query string on the URL.
      // POST transfers use that same URL and an empty body.
      const url = withQuery(applyTokens(ctx.baseUrl, ctx.lead), pairs);
      if (ctx.method === "GET") {
        return { url, method: "GET", headers: { ...ctx.headers } };
      }
      if (ctx.provider === "retreaver") {
        // Retreaver reads the POST query string. A JSON body is not part of the accepted request.
        return { url, method: "POST", headers: { ...ctx.headers } };
      }
      if (ctx.provider === "ringba" || ctx.provider === "intelhouse" || ctx.provider === "ringfuel") {
        return {
          url,
          method: "POST",
          headers: { "Content-Type": "application/json", ...ctx.headers },
          body: Object.fromEntries(pairs.map((pair) => [pair.key, pair.value])),
        };
      }
      return {
        url,
        method: "POST",
        headers: { ...ctx.headers },
      };
    },
    interpret: opts.interpret ?? defaultInterpret,
  };
}

function dig(obj: unknown, path: string[]): unknown {
  let cur = obj;
  for (const key of path) {
    if (cur && typeof cur === "object" && key in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[key];
    } else return undefined;
  }
  return cur;
}

const CALLGRID_CODES: Record<number, string> = {
  4001: "Disabled or unknown Grid ID",
  4002: "Campaign, source, or grid is paused",
  4003: "Invalid caller ID",
  4004: "No destinations available",
  4005: "Duplicate caller",
  4006: "No phone numbers available",
  4007: "Caller blocked",
  4008: "Duplicate bid",
  4009: "Failed tag rules",
  4010: "Bid not found",
  4011: "Bid expired",
  4012: "Bid does not require confirmation",
  4013: "All destinations closed",
  5001: "Rate limit exceeded",
};

/** CallGrid accepts a bid only when `code` is 1000. Phone bids need `pstn=true`. */
export const interpretCallGrid: Interpret = (body, httpStatus) => {
  const b = (body ?? {}) as Record<string, unknown>;
  const code = typeof b.code === "number" ? b.code : Number(b.code);
  const accepted = httpStatus < 400 && code === 1000;
  const bidRaw = b.dynamicBid;
  const bidNum = typeof bidRaw === "number" ? bidRaw : bidRaw != null && bidRaw !== "" ? Number(bidRaw) : NaN;
  const phone =
    (typeof b.dynamicPhoneNumber === "string" && b.dynamicPhoneNumber) ||
    (typeof b.dynamicSipAddress === "string" && b.dynamicSipAddress) ||
    null;
  const message = typeof b.message === "string" ? b.message : "";
  return {
    accepted,
    bid: Number.isFinite(bidNum) ? bidNum : null,
    trackingNumber: accepted ? phone : null,
    rejectReason: accepted
      ? null
      : message ||
        (Number.isFinite(code) ? CALLGRID_CODES[code] || `CallGrid code ${code}` : null) ||
        (httpStatus >= 400 ? `HTTP ${httpStatus}` : "Rejected"),
  };
};

/** NextGen vendor ping: `accept` is the decision, `cause` explains a rejection. */
export const interpretNextgen: Interpret = (body, httpStatus) => {
  const b = (body ?? {}) as Record<string, unknown>;
  const status = typeof b.status === "string" ? b.status.toLowerCase() : "";
  const available = typeof b.available === "number" ? b.available : Number(b.available);
  const ready = typeof b.ready === "number" ? b.ready : Number(b.ready);
  const accepted =
    httpStatus < 400 &&
    b.accept !== false &&
    (b.accept === true ||
      b.accepted === true ||
      status === "ready" ||
      status === "accepted" ||
      (Number.isFinite(available) && available > 0) ||
      (Number.isFinite(ready) && ready > 0));
  const bidRaw = b.bidAmount ?? b.bid ?? b.price ?? b.payout ?? b.cpa ?? b.rate ?? b.amount;
  const bidNum = typeof bidRaw === "number" ? bidRaw : bidRaw != null && bidRaw !== "" ? Number(bidRaw) : NaN;
  const phone =
    (typeof b.destination === "string" && b.destination) ||
    (typeof b.transfer_number === "string" && b.transfer_number) ||
    (typeof b.phone === "string" && b.phone) ||
    (typeof b.did === "string" && b.did) ||
    (typeof b.number === "string" && b.number) ||
    (typeof b.tracking_number === "string" && b.tracking_number) ||
    null;
  const cause = typeof b.cause === "string" ? b.cause : "";
  const reason = typeof b.reason === "string" ? b.reason : "";
  return {
    accepted,
    bid: Number.isFinite(bidNum) ? bidNum : null,
    trackingNumber: accepted ? phone : null,
    rejectReason: accepted ? null : cause || reason || (httpStatus >= 400 ? `HTTP ${httpStatus}` : "Rejected"),
  };
};

/** Callisto returns a bid on `pricing` and the transfer number on `agents[0].phone`. */
export const interpretCallisto: Interpret = (body, httpStatus) => {
  const b = (body ?? {}) as Record<string, unknown>;
  const agents = Array.isArray(b.agents) ? (b.agents as Record<string, unknown>[]) : [];
  const available = typeof b.available_agents === "number" ? b.available_agents : agents.length;
  const pricing = b.pricing && typeof b.pricing === "object" ? (b.pricing as Record<string, unknown>) : {};
  const dollars = typeof pricing.price_dollars === "number" ? pricing.price_dollars : Number(pricing.price_dollars);
  const cents = typeof pricing.price_cents === "number" ? pricing.price_cents : Number(pricing.price_cents);
  const bid = Number.isFinite(dollars) ? dollars : Number.isFinite(cents) ? cents / 100 : null;
  const phone = typeof agents[0]?.phone === "string" ? agents[0].phone : null;
  const accepted = httpStatus < 400 && available > 0 && (bid !== null || Boolean(phone));
  const reason = typeof b.reason === "string" && b.reason ? b.reason : "Rejected";
  return {
    accepted,
    bid,
    trackingNumber: phone,
    rejectReason: accepted ? null : reason,
  };
};

const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Home D15 is closed outside the buyer's Eastern Time window. Auto is 24/7 and has no windows. */
function mojaClosedReason(extra: Record<string, unknown>): string | null {
  const hours = extra.hours;
  if (!hours || typeof hours !== "object") return null;
  const windows = (hours as { windows?: unknown }).windows;
  if (!Array.isArray(windows) || windows.length === 0) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  const day = WEEKDAY[parts.weekday] ?? -1;
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const now = (hour === 24 ? 0 : hour) * 60 + minute;
  const open = windows.some((window) => {
    if (!window || typeof window !== "object") return false;
    const row = window as { days?: unknown; start?: unknown; end?: unknown };
    const days = Array.isArray(row.days) ? row.days.map(Number) : [];
    const [startHour, startMinute] = String(row.start || "").split(":").map(Number);
    const [endHour, endMinute] = String(row.end || "").split(":").map(Number);
    if (!days.includes(day) || !Number.isFinite(startHour) || !Number.isFinite(endHour)) return false;
    const start = startHour * 60 + (startMinute || 0);
    const end = endHour * 60 + (endMinute || 0);
    return now >= start && now < end;
  });
  if (open) return null;
  return typeof (hours as { label?: unknown }).label === "string"
    ? `Outside buyer hours (${(hours as { label: string }).label})`
    : "Outside buyer hours";
}

/** Moja Inbound RTB: a bid is an eligible route with a transfer number and payout. */
export const interpretMoja: Interpret = (body, httpStatus) => {
  const b = (body ?? {}) as Record<string, unknown>;
  const routes = Array.isArray(b.eligible_routes) ? (b.eligible_routes as Record<string, unknown>[]) : [];
  const route = routes.find((item) => item && (typeof item.number === "string" || item.payout != null));
  const payout = route ? Number(route.payout) : NaN;
  const number = route && typeof route.number === "string" ? route.number : null;
  const accepted = httpStatus < 400 && b.success === true && Boolean(number);
  const message = typeof b.message === "string" ? b.message : "";
  const reason = typeof b.reason === "string" ? b.reason : "";
  return {
    accepted,
    bid: Number.isFinite(payout) ? payout : null,
    trackingNumber: accepted ? number : null,
    rejectReason: accepted ? null : message || reason || (b.success === false ? "No eligible route" : httpStatus >= 400 ? `HTTP ${httpStatus}` : "No eligible route"),
  };
};

/** Best-effort interpretation that covers the common RTB response shapes. */
export const defaultInterpret: Interpret = (body, httpStatus) => {
  const b = (body ?? {}) as Record<string, unknown>;
  const ping = (b.ping ?? {}) as Record<string, unknown>;
  const success =
    b.success === true ||
    ping.success === true ||
    b.status === "accepted" ||
    b.status === "reserved" ||
    ping.status === "accepted" ||
    ping.status === "reserved" ||
    b.accepted === true;

  const buyer0 = Array.isArray(b.buyers) ? (b.buyers[0] as Record<string, unknown> | undefined) : undefined;
  const offerPayouts = (Array.isArray(b.buyers) ? b.buyers : [])
    .map((buyer) => (buyer as Record<string, unknown>).offer_conversion_payout)
    .map((value) => (typeof value === "number" ? value : value ? Number(value) : NaN))
    .filter((value) => Number.isFinite(value));
  const bidRaw =
    dig(body, ["bid"]) ??
    dig(body, ["payout"]) ??
    dig(body, ["price"]) ??
    dig(body, ["bidAmount"]) ??
    dig(body, ["retreaver_payout"]) ??
    dig(body, ["ping", "bid"]) ??
    (offerPayouts.length ? Math.max(...offerPayouts) : undefined) ??
    buyer0?.bid ??
    buyer0?.payout ??
    buyer0?.price ??
    buyer0?.bid_amount;
  const bid = typeof bidRaw === "number" ? bidRaw : bidRaw ? Number(bidRaw) : null;

  const tracking =
    (dig(body, ["tracking_number"]) as string | undefined) ??
    (dig(body, ["trackingNumber"]) as string | undefined) ??
    (dig(body, ["phoneNumber"]) as string | undefined) ??
    (dig(body, ["inbound_number"]) as string | undefined) ??
    (dig(body, ["phone_number"]) as string | undefined) ??
    (dig(body, ["ping", "tracking_number"]) as string | undefined) ??
    (buyer0?.tracking_number as string | undefined) ??
    (buyer0?.phone_number as string | undefined) ??
    (buyer0?.phoneNumber as string | undefined) ??
    (buyer0?.number as string | undefined) ??
    null;

  const errorObject = b.error && typeof b.error === "object" ? (b.error as { message?: string }) : undefined;
  const errorText = typeof b.error === "string" ? b.error : undefined;
  const statusInfo = typeof b.status_info === "string" ? b.status_info : undefined;
  const fieldErrors = b.errors && !Array.isArray(b.errors) && typeof b.errors === "object"
    ? Object.entries(b.errors as Record<string, unknown>).map(([key, value]) => {
        const text = Array.isArray(value) ? value.map(String).join(", ") : String(value);
        return `${key}: ${text}`;
      })
    : [];
  const errors = (Array.isArray(b.errors) ? b.errors : Array.isArray(ping.errors) ? ping.errors : []) as unknown[];
  const rejectReason = success
    ? null
    :       fieldErrors.join("; ") ||
      errors.map(String).join("; ") ||
      (typeof errorObject?.message === "string" ? errorObject.message : null) ||
      (typeof b.message === "string" ? b.message : null) ||
      errorText ||
      (statusInfo && statusInfo !== "accepted" ? statusInfo : null) ||
      (typeof b.status === "string" && b.status !== "accepted" && b.status !== "reserved" ? String(b.status) : null) ||
      (httpStatus >= 400 ? `HTTP ${httpStatus}` : "Rejected");

  const numericBid = bid !== null && Number.isFinite(bid) ? bid : null;
  const explicitReject =
    b.success === false ||
    ping.success === false ||
    b.available === false ||
    b.status === "rejected" ||
    b.status === "no_matching_buyer";
  const accepted =
    httpStatus < 400 &&
    !explicitReject &&
    fieldErrors.length === 0 &&
    !errorObject?.message &&
    (Boolean(success) || numericBid !== null || Boolean(tracking));

  return {
    accepted,
    bid: numericBid,
    trackingNumber: tracking,
    rejectReason: accepted ? null : rejectReason,
  };
};
