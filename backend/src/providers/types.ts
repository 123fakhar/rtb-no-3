export interface ParamPair {
  key: string;
  value: string;
}

export interface ProviderContext {
  provider: string;
  method: "GET" | "POST";
  baseUrl: string;
  apiKey: string;
  params: ParamPair[];
  staticParams: Record<string, string>;
  headers: Record<string, string>;
  extra: Record<string, unknown>;
  campaignDefaults: Record<string, string>;
  lead: { phone: string; zip: string; state: string };
}

export interface ProviderResult {
  accepted: boolean;
  bid: number | null;
  trackingNumber: string | null;
  rejectReason: string | null;
  requestUrl: string;
  requestBody: unknown;
  responseBody: unknown;
  httpStatus: number | null;
}

export interface ProviderAdapter {
  /** Provider key stored on configs, e.g. "ringba". */
  key: string;
  label: string;
  /** Human description of the fields this provider expects in `extra`. */
  fields: { key: string; label: string; secret?: boolean }[];
  buildRequest(ctx: ProviderContext): BuiltRequest;
  interpret(responseBody: unknown, httpStatus: number): Omit<ProviderResult, "requestUrl" | "requestBody" | "responseBody" | "httpStatus">;
}

export interface BuiltRequest {
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: unknown;
}
