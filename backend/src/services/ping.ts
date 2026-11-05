import type { Campaign, Lead, RtbConfig } from "@prisma/client";
import { config as appConfig } from "../config";
import { HttpError } from "../lib/http";
import { prisma } from "../lib/prisma";
import { getProvider } from "../providers";
import type { ParamPair, ProviderResult } from "../providers/types";

/** Shown when an admin has already accepted this lead for the same buyer. */
export const ALREADY_SOLD_MESSAGE = "You already made a sale on this lead to this buyer";
export const ALREADY_SOLD_CODE = "ALREADY_SOLD";

export interface PingInput {
  lead: Lead & { campaign: Campaign | null };
  rtbConfig: RtbConfig;
  agentId: string;
}

/** Execute a REAL buyer ping over HTTP and persist the genuine result. Never mocks fake numbers. */
export async function executePing(input: PingInput) {
  const { lead, rtbConfig, agentId } = input;

  const approvedSale = await prisma.crmEntry.findFirst({
    where: { leadId: lead.id, buyerId: rtbConfig.buyerId, status: "APPROVED" },
    select: { id: true },
  });
  if (approvedSale) {
    throw new HttpError(409, ALREADY_SOLD_MESSAGE, ALREADY_SOLD_CODE);
  }

  const adapter = getProvider(rtbConfig.provider);

  const started = Date.now();
  let result: ProviderResult;

  try {
    const built = adapter.buildRequest({
      provider: rtbConfig.provider,
      method: rtbConfig.method,
      baseUrl: rtbConfig.baseUrl,
      apiKey: rtbConfig.apiKey,
      params: (rtbConfig.params as unknown as ParamPair[]) ?? [],
      staticParams: (rtbConfig.staticParams as Record<string, string>) ?? {},
      headers: (rtbConfig.headers as Record<string, string>) ?? {},
      extra: (rtbConfig.extra as Record<string, unknown>) ?? {},
    campaignDefaults: ((rtbConfig as RtbConfig & { campaign?: { defaults?: Record<string, string> | null } | null }).campaign
      ?.defaults as Record<string, string>) ?? {},
      lead: { phone: lead.phone, zip: lead.zip, state: lead.state },
    });

    if (!built.url || !built.url.startsWith("http")) {
      result = {
        accepted: false,
        bid: null,
        trackingNumber: null,
        rejectReason: "Invalid or missing buyer endpoint URL",
        requestUrl: built.url || rtbConfig.baseUrl,
        requestBody: built.body ?? null,
        responseBody: { error: "No valid HTTP URL configured for buyer" },
        httpStatus: 400,
      };
    } else {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), appConfig.requestTimeoutMs);
      let httpStatus: number | null = null;
      let responseBody: unknown = null;

      try {
        const res = await fetch(built.url, {
          method: built.method,
          headers: built.headers,
          body: built.method === "POST" && built.body ? JSON.stringify(built.body) : undefined,
          signal: controller.signal,
        });
        httpStatus = res.status;
        const text = await res.text();
        try {
          responseBody = text ? JSON.parse(text) : null;
        } catch {
          responseBody = { raw: text.slice(0, 4000) };
        }
      } catch (networkErr: any) {
        httpStatus = null;
        responseBody = {
          error: "Network request failed",
          message: networkErr?.name === "AbortError" ? "Request timed out" : networkErr?.message || "Connection refused",
        };
      } finally {
        clearTimeout(timer);
      }

      if (responseBody && httpStatus !== null) {
        const interpreted = adapter.interpret(responseBody, httpStatus);
        result = {
          ...interpreted,
          requestUrl: built.url,
          requestBody: built.body ?? null,
          responseBody,
          httpStatus,
        };
      } else {
        // Real connection failure (no simulated fake success!)
        const errMsg = (responseBody as any)?.message || "Failed to connect to buyer endpoint";
        result = {
          accepted: false,
          bid: null,
          trackingNumber: null,
          rejectReason: errMsg,
          requestUrl: built.url,
          requestBody: built.body ?? null,
          responseBody: responseBody || { error: errMsg },
          httpStatus: 502,
        };
      }
    }
  } catch (err: any) {
    result = {
      accepted: false,
      bid: null,
      trackingNumber: null,
      rejectReason: err instanceof Error ? err.message : "Request failed",
      requestUrl: rtbConfig.baseUrl || "",
      requestBody: null,
      responseBody: { error: err?.message || "Execution exception" },
      httpStatus: 500,
    };
  }

  if (result.accepted && !result.trackingNumber) {
    const dialer = dialerNumberFromConfig((rtbConfig.extra as Record<string, unknown>) ?? {});
    if (dialer) result.trackingNumber = dialer;
  }

  const durationMs = Date.now() - started;

  const ping = await prisma.ping.create({
    data: {
      leadId: lead.id,
      buyerId: rtbConfig.buyerId,
      configId: rtbConfig.id,
      agentId,
      status: result.accepted ? "RESERVED" : "REJECTED",
      bid: result.bid,
      trackingNumber: result.trackingNumber,
      rejectReason: result.rejectReason,
      requestUrl: result.requestUrl.slice(0, 2000),
      requestBody: (result.requestBody as object) ?? undefined,
      responseBody: (result.responseBody as object) ?? undefined,
      httpStatus: result.httpStatus ?? 500,
      durationMs,
    },
    include: {
      buyer: true,
      config: { include: { campaign: true } },
    },
  });

  await prisma.rtbConfig.update({
    where: { id: rtbConfig.id },
    data: {
      totalCount: { increment: 1 },
      successCount: { increment: result.accepted ? 1 : 0 },
      lastTestedAt: new Date(),
    },
  });

  if (result.accepted && ping.buyerId) {
    try {
      await recordBidForReview({
        lead,
        agentId,
        buyerId: ping.buyerId,
        buyerName: ping.buyer?.name ?? "Buyer",
        pingId: ping.id,
        campaignId: rtbConfig.campaignId,
        bid: result.bid,
        dialer: ping.trackingNumber,
      });
    } catch (err) {
      console.error("Failed to queue the bid for CRM review", err);
    }
  }

  return ping;
}

/** TrackDrive caller-number bids reserve the campaign DID. That is the number to dial. */
function dialerNumberFromConfig(extra: Record<string, unknown>): string | null {
  const raw = String(extra.trackdriveNumber || extra.providerCampaignId || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return null;
}

/** A winning bid waits in CRM. It is not a sale until an admin accepts it. */
async function recordBidForReview(input: {
  lead: { id: string; phone: string; zip: string };
  agentId: string;
  buyerId: string;
  buyerName: string;
  pingId: string;
  campaignId: string | null;
  bid: number | null;
  dialer: string | null;
}) {
  const agent = await prisma.user.findUnique({ where: { id: input.agentId }, select: { name: true } });
  const payout = input.bid != null ? `$${input.bid.toFixed(2)}` : "a bid";
  const dialer = input.dialer || "the tracking number";
  await prisma.crmEntry.create({
    data: {
      fronterName: agent?.name || "Agent",
      customerName: `Caller ${input.lead.phone}`,
      customerNumber: input.lead.phone,
      customerZip: /^\d{5}/.test(input.lead.zip) ? input.lead.zip : "00000",
      did: input.dialer ?? "",
      campaignId: input.campaignId,
      comment: `${payout} from ${input.buyerName}. Dial ${dialer} so the customer can talk to the buyer. This becomes a sale only if an admin accepts it.`,
      leadId: input.lead.id,
      buyerId: input.buyerId,
      pingId: input.pingId,
      agentId: input.agentId,
      status: "PENDING",
    },
  });
}

/** Preview the URL a config would call for a lead, without sending anything. */
export function previewUrl(
  rtbConfig: RtbConfig,
  lead: { phone: string; zip: string; state: string },
  defaults: Record<string, string>
) {
  const adapter = getProvider(rtbConfig.provider);
  const built = adapter.buildRequest({
    provider: rtbConfig.provider,
    method: rtbConfig.method,
    baseUrl: rtbConfig.baseUrl,
    apiKey: rtbConfig.apiKey,
    params: (rtbConfig.params as unknown as ParamPair[]) ?? [],
    staticParams: (rtbConfig.staticParams as Record<string, string>) ?? {},
    headers: {},
    extra: (rtbConfig.extra as Record<string, unknown>) ?? {},
    campaignDefaults: defaults,
    lead,
  });
  return built.url;
}
