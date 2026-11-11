import type { BuiltRequest, ProviderAdapter, ProviderContext, ProviderResult } from "./types";
import { e164Phone, postalCode, resolvedParams, tenDigitPhone, withQuery } from "./url";

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

      if (opts.apiKeyParam && ctx.apiKey && !has(opts.apiKeyParam)) {
        pairs.push({ key: opts.apiKeyParam, value: ctx.apiKey });
      }

      if (ctx.provider === "intelhouse") {
        const allowed = new Set(["caller_number", "caller_zip", "publisher_id", "campaign_id"]);
        for (let i = pairs.length - 1; i >= 0; i -= 1) {
          if (!allowed.has(pairs[i].key)) pairs.splice(i, 1);
        }
      }
      // Reference buyers are called with the query string on the URL.
      // POST transfers use that same URL and an empty body.
      const url = withQuery(ctx.baseUrl, pairs);
      if (ctx.method === "GET") {
        return { url, method: "GET", headers: { ...ctx.headers } };
      }
      if (ctx.provider === "ringba" || ctx.provider === "retreaver" || ctx.provider === "intelhouse" || ctx.provider === "ringfuel") {
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
