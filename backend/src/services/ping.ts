import type { Campaign, Lead, RtbConfig } from "@prisma/client";
import { config as appConfig } from "../config";
import { prisma } from "../lib/prisma";
import { getProvider } from "../providers";
import type { ParamPair, ProviderResult } from "../providers/types";

export interface PingInput {
  lead: Lead & { campaign: Campaign | null };
  rtbConfig: RtbConfig;
  agentId: string;
}

/** Execute a REAL buyer ping over HTTP and persist the genuine result. Never mocks fake numbers. */
export async function executePing(input: PingInput) {
  const { lead, rtbConfig, agentId } = input;
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
      campaignDefaults: (lead.campaign?.defaults as Record<string, string>) ?? {},
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

  if (result.accepted) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: "SOLD",
        buyerId: rtbConfig.buyerId,
        revenue: result.bid ?? 0,
      },
    });
  }

  return ping;
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
