import type { ProviderAdapter } from "./types";
import { createGenericAdapter, defaultInterpret, interpretCallisto, interpretCallGrid } from "./generic";

/**
 * One adapter per supported buyer platform. Adding a provider is a single
 * entry here — the admin UI reads this registry to render provider-specific
 * fields, and the ping service dispatches through it.
 */
export const providers: Record<string, ProviderAdapter> = {
  ringba: createGenericAdapter({
    key: "ringba",
    label: "Ringba",
    apiKeyParam: "key",
    fields: [{ key: "rtbId", label: "RTB ID" }],
  }),
  retreaver: createGenericAdapter({
    key: "retreaver",
    label: "Retreaver",
    apiKeyParam: "key",
    fields: [{ key: "apiKey", label: "API Key", secret: true }],
  }),
  trackdrive: createGenericAdapter({
    key: "trackdrive",
    label: "TrackDrive",
    apiKeyParam: "key",
    fields: [
      { key: "trafficSourceId", label: "Traffic Source ID" },
      { key: "trackdriveNumber", label: "TrackDrive Number" },
      { key: "pingEndpoint", label: "Ping Endpoint" },
      { key: "postEndpoint", label: "Post Endpoint" },
    ],
  }),
  ringfuel: createGenericAdapter({
    key: "ringfuel",
    label: "Ringfuel",
    apiKeyParam: "api_key",
    fields: [
      { key: "apiKey", label: "API Key", secret: true },
      { key: "campaignKey", label: "Campaign Key" },
    ],
  }),
  intelhouse: createGenericAdapter({
    key: "intelhouse",
    label: "IntelHouse",
    fields: [
      { key: "publisherId", label: "Publisher ID" },
      { key: "campaignId", label: "Campaign ID" },
      { key: "pingEndpoint", label: "Ping Endpoint" },
      { key: "postEndpoint", label: "Post Endpoint" },
    ],
  }),
  callgrid: createGenericAdapter({
    key: "callgrid",
    label: "Call Grid",
    fields: [
      { key: "sourceId", label: "Grid ID" },
      { key: "publisherId", label: "SubPublisherid" },
    ],
    interpret: interpretCallGrid,
  }),
  callisto: createGenericAdapter({
    key: "callisto",
    label: "Callisto",
    fields: [
      { key: "rtbId", label: "RTB ID" },
      { key: "pingEndpoint", label: "Ping Endpoint" },
    ],
    interpret: interpretCallisto,
  }),
  generic: createGenericAdapter({
    key: "generic",
    label: "Generic",
    apiKeyParam: "key",
    fields: [{ key: "apiKey", label: "API Key", secret: true }],
  }),
};

export function getProvider(key: string): ProviderAdapter {
  return providers[key] ?? { ...providers.generic, interpret: defaultInterpret };
}

export function listProviders() {
  return Object.values(providers)
    .filter((p) => p.key !== "generic")
    .map((p) => ({ key: p.key, label: p.label, fields: p.fields }));
}
