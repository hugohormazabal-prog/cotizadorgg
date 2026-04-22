import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  defaultBusinessSettings,
  normalizeBusinessSettings,
  type BusinessSettings,
} from "@/lib/config";

const SETTINGS_FILE = path.join(process.cwd(), "data", "runtime-business-settings.json");
const SETTINGS_KEY = "ggelectrics:business-settings";

async function kvRequest<T>(command: unknown[]): Promise<T | null> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return null;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`KV respondio ${response.status}`);
  }

  const payload = (await response.json()) as { result?: T };
  return payload.result ?? null;
}

export async function loadBusinessSettings(): Promise<BusinessSettings> {
  try {
    const remote = await kvRequest<string>(["GET", SETTINGS_KEY]);

    if (remote) {
      return normalizeBusinessSettings(JSON.parse(remote));
    }
  } catch {
    // Continue with local fallback so the public quote never fails because of config storage.
  }

  try {
    const raw = await readFile(SETTINGS_FILE, "utf8");
    return normalizeBusinessSettings(JSON.parse(raw));
  } catch {
    return defaultBusinessSettings;
  }
}

export async function saveBusinessSettings(settings: BusinessSettings) {
  const normalized = normalizeBusinessSettings(settings);

  try {
    const saved = await kvRequest<string>(["SET", SETTINGS_KEY, JSON.stringify(normalized)]);

    if (saved !== null) {
      return;
    }
  } catch {
    // Local fallback keeps the admin usable in development or while KV is not configured.
  }

  await mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  await writeFile(
    SETTINGS_FILE,
    `${JSON.stringify(normalized, null, 2)}\n`,
    "utf8",
  );
}
