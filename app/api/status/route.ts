import { NextResponse } from "next/server";
import { CLAUDE_MODEL, claudeConfigured } from "@/lib/ai/claude";
import { defaultProviderName, PROVIDERS } from "@/lib/tryon";
import { imageGenConfigured } from "@/lib/imagegen";
import type { IntegrationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Reports which integrations are configured. Never returns key material. */
export async function GET() {
  const body: IntegrationStatus = {
    claude: claudeConfigured(),
    claudeModel: claudeConfigured() ? CLAUDE_MODEL : undefined,
    tryOn: defaultProviderName(),
    tryOnProviders: {
      fashn: !!PROVIDERS.find((p) => p.name === "fashn")?.configured(),
      replicate: !!PROVIDERS.find((p) => p.name === "replicate")?.configured(),
    },
    imageGen: imageGenConfigured(),
  };
  return NextResponse.json(body);
}
