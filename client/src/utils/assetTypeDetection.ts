// Utility functions for detecting computer-type assets

interface Asset {
  id: string;
  name: string;
  type?: string;
  category?: string;
}

/**
 * Keywords that indicate a computer-type asset (case-insensitive)
 */
const COMPUTER_TYPE_KEYWORDS = [
  'laptop',
  'notebook',
  'mini pc',
  'nuc',
  'all in one',
  'all-in-one',
  'aio',
  'desktop',
  'workstation',
  'computer',
  'pc',
];

/**
 * Keywords that indicate a component (not a computer) - these should be excluded
 */
const COMPONENT_KEYWORDS = [
  'ram',
  'memory',
  'ssd',
  'hdd',
  'hard drive',
  'hard disk',
  'gpu',
  'graphics card',
  'video card',
  'cpu',
  'processor',
  'motherboard',
  'psu',
  'power supply',
  'monitor',
  'keyboard',
  'mouse',
  'headset',
  'speaker',
  'webcam',
  'dock',
  'hub',
  'adapter',
  'cable',
  'charger',
  'battery',
];

/**
 * Checks if a single asset is a computer-type asset
 * @param asset - The asset to check
 * @returns true if the asset is a computer-type asset
 */
export function isComputerTypeAsset(asset: Asset): boolean {
  const searchFields = [
    asset.type || '',
    asset.category || '',
  ].join(' ').toLowerCase();

  // First check if it's a component (exclude these)
  const isComponent = COMPONENT_KEYWORDS.some(keyword =>
    searchFields.includes(keyword)
  );
  if (isComponent) {
    return false;
  }

  // Then check if it's a computer-type asset
  return COMPUTER_TYPE_KEYWORDS.some(keyword =>
    searchFields.includes(keyword)
  );
}

/**
 * Checks if any of the selected assets are computer-type assets
 * @param assets - Array of assets to check
 * @param selectedAssetIds - Array of selected asset IDs
 * @returns true if any selected asset is a computer-type asset
 */
export function hasComputerTypeAssets(
  assets: Asset[],
  selectedAssetIds: string[]
): boolean {
  const selectedAssets = assets.filter(asset =>
    selectedAssetIds.includes(asset.id)
  );

  return selectedAssets.some(asset => isComputerTypeAsset(asset));
}

/**
 * Filters assets to return only computer-type assets
 * @param assets - Array of assets to filter
 * @returns Array of computer-type assets
 */
export function filterComputerTypeAssets(assets: Asset[]): Asset[] {
  return assets.filter(asset => isComputerTypeAsset(asset));
}

/**
 * Filters assets to return non-computer-type assets
 * @param assets - Array of assets to filter
 * @returns Array of non-computer-type assets
 */
export function filterNonComputerTypeAssets(assets: Asset[]): Asset[] {
  return assets.filter(asset => !isComputerTypeAsset(asset));
}
