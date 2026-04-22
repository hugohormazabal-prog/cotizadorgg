import { NextResponse } from "next/server";
import { loadBusinessSettings } from "@/lib/server/business-settings-store";
import { loadMarketData } from "@/lib/server/market-data";

export async function GET() {
  const settings = await loadBusinessSettings();
  const marketData = await loadMarketData(settings);

  return NextResponse.json({
    settings,
    marketData,
  });
}
