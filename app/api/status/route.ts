import { NextResponse } from "next/server";
import { CLAUDE_MODEL, claudeConfigured } from "@/lib/ai/claude";
import { defaultProviderName, PROVIDERS } from "@/lib/tryon";
import { imageGenConfigured, imageProvider } from "@/lib/imagegen";
import { blobEnabled } from "@/lib/blobcache";
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
      huggingface: !!PROVIDERS.find((p) => p.name === "huggingface")?.configured(),
    },
    imageGen: imageGenConfigured(),
    imageProvider: imageProvider(),
    imageLibrary: blobEnabled(),
  };
  return NextResponse.json(body);
}
