const SCANNER_PREFIX = /^\]?(?:C1|Q1|A0|E0)/i;
const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;
/** Matches /assets/details/CODE, assets/details/CODE, or truncated details/CODE */
const ASSET_DETAILS_PATH = /(?:^|[/?#])(?:assets\/)?details\/([^/?#\s]+)/i;

function cleanAssetCode(code: string): string {
  return decodeURIComponent(code.replace(CONTROL_CHARS, '')).trim();
}

function extractFromUrl(candidate: string): string | null {
  try {
    const url = new URL(candidate);
    const pathMatch = url.pathname.match(/\/(?:assets\/)?details\/([^/]+)/i);
    if (pathMatch?.[1]) {
      return cleanAssetCode(pathMatch[1]);
    }
  } catch {
    // Not a valid URL.
  }
  return null;
}

/**
 * Normalize raw scanner / keyboard input into an asset code.
 * Handles QR URLs, scanner prefixes/suffixes, and stray whitespace.
 */
export function parseScannedAssetCode(raw: string): string {
  let code = raw.replace(CONTROL_CHARS, '').trim();
  if (!code) return '';

  code = code.replace(SCANNER_PREFIX, '').trim();
  if (!code) return '';

  if (/^https?:\/\//i.test(code)) {
    const fromUrl = extractFromUrl(code);
    if (fromUrl) return fromUrl;
  } else {
    const fromUrl = extractFromUrl(`http://${code}`);
    if (fromUrl) return fromUrl;
  }

  const pathMatch = code.match(ASSET_DETAILS_PATH);
  if (pathMatch?.[1]) {
    return cleanAssetCode(pathMatch[1]);
  }

  return code
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/[^a-zA-Z0-9-]+$/, '')
    .trim();
}

export function assetCodesMatch(a: string, b: string): boolean {
  return a.trim().toUpperCase() === b.trim().toUpperCase();
}

export function findAssetByScannedCode<T extends { id: string }>(
  assets: T[],
  rawCode: string
): T | undefined {
  const code = parseScannedAssetCode(rawCode);
  if (!code) return undefined;
  return assets.find(asset => assetCodesMatch(asset.id, code));
}
