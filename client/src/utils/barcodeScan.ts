/**
 * Normalize raw scanner / keyboard input into an asset code.
 * Handles QR URLs, scanner prefixes/suffixes, and stray whitespace.
 */
export function parseScannedAssetCode(raw: string): string {
  let code = raw.trim();
  if (!code) return '';

  try {
    if (/^https?:\/\//i.test(code)) {
      const url = new URL(code);
      const pathMatch = url.pathname.match(/\/assets\/details\/([^/]+)/i);
      if (pathMatch?.[1]) {
        code = decodeURIComponent(pathMatch[1]);
      }
    }
  } catch {
    // Not a valid URL — use raw value.
  }

  const inlineUrlMatch = code.match(/\/assets\/details\/([^/?#\s]+)/i);
  if (inlineUrlMatch?.[1]) {
    code = decodeURIComponent(inlineUrlMatch[1]);
  }

  return code
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/^\]?(?:C1|A0|E0)/i, '')
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
