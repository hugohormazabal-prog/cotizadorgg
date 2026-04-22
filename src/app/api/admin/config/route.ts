import { NextRequest, NextResponse } from "next/server";
import { normalizeBusinessSettings, type BusinessSettings } from "@/lib/config";
import {
  loadBusinessSettings,
  saveBusinessSettings,
} from "@/lib/server/business-settings-store";
import { loadMarketData } from "@/lib/server/market-data";

export async function GET() {
  const settings = await loadBusinessSettings();
  const marketData = await loadMarketData(settings);

  return NextResponse.json({
    settings,
    marketData,
  });
}

export async function PUT(request: NextRequest) {
  const payload = (await request.json()) as { settings?: Partial<BusinessSettings> };
  const settings = normalizeBusinessSettings(payload.settings);

  await saveBusinessSettings(settings);

  return NextResponse.json({
    settings,
    marketData: await loadMarketData(settings),
  });
}
