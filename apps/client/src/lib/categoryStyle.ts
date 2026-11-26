import type { IconName } from '@marketplace/mobile';

// Icon + pastel tile color per category slug (falls back to a basket).
const MAP: Record<string, { icon: IconName; bg: string; fg: string }> = {
  'fruits-vegetables': { icon: 'nutrition', bg: '#E6F2DF', fg: '#3F7D2C' },
  dairy: { icon: 'egg', bg: '#E4EEF8', fg: '#2F6496' },
  'meat-poultry': { icon: 'restaurant', bg: '#FBE3DE', fg: '#B5442E' },
  'fish-seafood': { icon: 'fish', bg: '#DFF1F2', fg: '#227A80' },
  bakery: { icon: 'fast-food', bg: '#F8EBD7', fg: '#9A6421' },
  grocery: { icon: 'cube', bg: '#F1ECE1', fg: '#7A6A45' },
  'sausages-deli': { icon: 'pizza', bg: '#F9E2E6', fg: '#A63A52' },
  frozen: { icon: 'snow', bg: '#E5F0FA', fg: '#3A73A8' },
  sweets: { icon: 'ice-cream', bg: '#FBE4EF', fg: '#B23F79' },
  drinks: { icon: 'water', bg: '#E8E6F8', fg: '#5848A8' },
  'tea-coffee': { icon: 'cafe-outline', bg: '#EFE6DC', fg: '#7A5133' },
  baby: { icon: 'happy', bg: '#FDF1D8', fg: '#A47414' },
  household: { icon: 'sparkles', bg: '#E1F3EC', fg: '#2A7D5B' },
  hygiene: { icon: 'flower', bg: '#F3E6F7', fg: '#8A4BA0' },
  pets: { icon: 'paw', bg: '#F4EADF', fg: '#8A5A2B' },
};

export function categoryStyle(slug: string) {
  return MAP[slug] ?? { icon: 'basket' as IconName, bg: '#F4EDE1', fg: '#7B7466' };
}
