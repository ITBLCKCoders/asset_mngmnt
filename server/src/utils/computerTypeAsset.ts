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

/** Server-side mirror of client computer-type asset detection (type name only). */
export function isComputerTypeName(typeName: string | null | undefined): boolean {
  const searchFields = (typeName || '').toLowerCase();
  if (COMPONENT_KEYWORDS.some(keyword => searchFields.includes(keyword))) {
    return false;
  }
  return COMPUTER_TYPE_KEYWORDS.some(keyword => searchFields.includes(keyword));
}
