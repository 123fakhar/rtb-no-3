import type { BuiltRequest, ProviderAdapter, ProviderContext, ProviderResult } from "./types";
import { resolvedParams, withQuery } from "./url";

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
      const pairs = resolvedParams(ctx);
      if (opts.apiKeyParam && ctx.apiKey) {
        pairs.push({ key: opts.apiKeyParam, value: ctx.apiKey });
      }
      if (ctx.method === "GET") {
        return { url: withQuery(ctx.baseUrl, pairs), method: "GET", headers: { ...ctx.headers } };
      }
      const body = Object.fromEntries(pairs.map((p) => [p.key, p.value]));
      return {
        url: ctx.baseUrl,
        method: "POST",
        headers: { "Content-Type": "application/json", ...ctx.headers },
        body,
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

/** Best-effort interpretation that covers the common RTB response shapes. */
export const defaultInterpret: Interpret = (body, httpStatus) => {
  const b = (body ?? {}) as Record<string, unknown>;
  const ping = (b.ping ?? {}) as Record<string, unknown>;
  const success =
    b.success === true ||
    ping.success === true ||
    b.status === "accepted" ||
    ping.status === "accepted" ||
    b.accepted === true;

  const bidRaw = dig(body, ["bid"]) ?? dig(body, ["payout"]) ?? dig(body, ["price"]) ?? dig(body, ["ping", "bid"]);
  const bid = typeof bidRaw === "number" ? bidRaw : bidRaw ? Number(bidRaw) : null;

  const tracking =
    (dig(body, ["tracking_number"]) as string | undefined) ??
    (dig(body, ["trackingNumber"]) as string | undefined) ??
    (dig(body, ["ping", "tracking_number"]) as string | undefined) ??
    null;

  const errors = (Array.isArray(b.errors) ? b.errors : Array.isArray(ping.errors) ? ping.errors : []) as unknown[];
  const rejectReason = success
    ? null
    : errors.map(String).join("; ") ||
      (typeof b.message === "string" ? b.message : null) ||
      (typeof b.status === "string" && b.status !== "accepted" ? b.status : null) ||
      (httpStatus >= 400 ? `HTTP ${httpStatus}` : "Rejected");

  return {
    accepted: Boolean(success) && httpStatus < 400,
    bid: bid !== null && Number.isFinite(bid) ? bid : null,
    trackingNumber: tracking,
    rejectReason: success ? null : rejectReason,
  };
};
