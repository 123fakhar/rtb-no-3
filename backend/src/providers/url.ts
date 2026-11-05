import type { ParamPair, ProviderContext } from "./types";

function clean(value: string | undefined | null): string {
  if (!value || value === "undefined" || value === "null") return "";
  return value;
}

/** 10-digit US caller ID. An 11-digit value starting with 1 drops the country code. */
export function tenDigitPhone(phone: string): string {
  const digits = clean(phone).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

/** 5-digit ZIP, or ZIP+4. The literal string "undefined" is not a ZIP. */
export function postalCode(zip: string | undefined | null): string {
  const match = clean(zip).match(/\d{5}(?:-\d{4})?/);
  return match ? match[0] : "";
}

export function e164Phone(phone: string): string {
  const ten = tenDigitPhone(phone);
  return ten.length === 10 ? `+1${ten}` : clean(phone);
}

/** Token substitution for values like "{caller_number}". */
export function applyTokens(template: string, lead: ProviderContext["lead"]): string {
  return template
    .replaceAll("{caller_number}", tenDigitPhone(lead.phone))
    .replaceAll("{caller_zip}", postalCode(lead.zip))
    .replaceAll("{caller_state}", clean(lead.state))
    .replaceAll("{homeowner}", "yes")
    .replaceAll("{property_type}", "single_family")
    .replaceAll("{placement_id}", "");
}

export function resolvedParams(ctx: ProviderContext): ParamPair[] {
  const merged: ParamPair[] = [
    ...Object.entries(ctx.campaignDefaults).map(([key, value]) => ({ key, value })),
    ...Object.entries(ctx.staticParams).map(([key, value]) => ({ key, value })),
    ...ctx.params,
  ];
  // Later entries win so explicit params override campaign defaults.
  const byKey = new Map<string, string>();
  for (const pair of merged) {
    if (!pair.key) continue;
    byKey.set(pair.key, applyTokens(pair.value, ctx.lead));
  }
  return [...byKey.entries()].map(([key, value]) => ({ key, value }));
}

export function buildQuery(pairs: ParamPair[]): string {
  const sp = new URLSearchParams();
  for (const { key, value } of pairs) sp.append(key, value);
  return sp.toString();
}

/** Append query params to a base URL, preserving any existing query string. */
export function withQuery(baseUrl: string, pairs: ParamPair[]): string {
  const qs = buildQuery(pairs);
  if (!qs) return baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}${qs}`;
}
