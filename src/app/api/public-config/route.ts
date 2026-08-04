import { NextResponse } from "next/server";
import { defaultBusinessSettings } from "@/lib/config";
import { createFallbackMarketData } from "@/lib/market-data";
import { loadBusinessSettings } from "@/lib/server/business-settings-store";
import { loadMarketData } from "@/lib/server/market-data";

export async function GET() {
  try {
    const settings = await loadBusinessSettings();
    const marketData = await loadMarketData(settings);

    return NextResponse.json({
      settings,
      marketData,
    });
  } catch {
    return NextResponse.json({
      settings: defaultBusinessSettings,
      marketData: createFallbackMarketData(defaultBusinessSettings),
    });
  }
}
