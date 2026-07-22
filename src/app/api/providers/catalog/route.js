import { NextResponse } from "next/server";
import {
  APIKEY_PROVIDERS,
  FREE_TIER_PROVIDERS,
  FREE_PROVIDERS,
  OAUTH_PROVIDERS,
} from "@/shared/constants/providers";

export const dynamic = "force-dynamic";

// Full provider catalog from the registry (single source of truth) so the CLI's
// terminal menu can list every addable provider instead of a hardcoded shortlist.
// apikey bucket = every non-OAuth provider connectable with a key (apikey + free tiers).
const pick = (map) =>
  Object.values(map)
    .filter((p) => !p.hidden && !p.deprecated)
    .map((p) => ({ id: p.id, name: p.name, alias: p.alias }));

export async function GET() {
  const apikey = pick({ ...APIKEY_PROVIDERS, ...FREE_TIER_PROVIDERS, ...FREE_PROVIDERS })
    .sort((a, b) => a.name.localeCompare(b.name));
  const oauth = pick(OAUTH_PROVIDERS).sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ apikey, oauth });
}
