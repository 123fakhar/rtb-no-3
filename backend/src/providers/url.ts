import type { ParamPair, ProviderContext } from "./types";

/** Token substitution for values like "{caller_number}". */
export function applyTokens(template: string, lead: ProviderContext["lead"]): string {
  return template
    .replaceAll("{caller_number}", lead.phone)
    .replaceAll("{caller_zip}", lead.zip)
    .replaceAll("{caller_state}", lead.state)
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
