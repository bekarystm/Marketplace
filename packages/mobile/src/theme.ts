// TDKFOOD design tokens — warm grocery style: cream background, deep green, orange accents.
export const colors = {
  // brand
  primary: '#1F4D2B', // deep green: main buttons, active tab, banners
  primaryDark: '#163A20',
  primarySoft: '#E3ECE2', // light green backgrounds, selected chips
  accent: '#E8661A', // orange: add-to-cart, checkout, discounts
  accentDark: '#C9540F',
  accentSoft: '#FDE8DA',

  // surfaces
  bg: '#FBF7EF', // cream app background
  card: '#FFFFFF',
  surface: '#F4EDE1', // beige tiles, image wells, secondary buttons
  border: '#EAE0D0',

  // text
  text: '#1E2A20',
  textMuted: '#7B7466',
  white: '#FFFFFF',

  // states
  danger: '#C0392B',
  warning: '#B7791F',
  success: '#2F7D45',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
export const font = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, hero: 30 };

/** Soft shadow for floating cards (iOS) / elevation (Android). */
export const shadow = {
  shadowColor: '#3B2F1E',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

export const BRAND = { name: 'TDKFOOD', first: 'TDK', second: 'FOOD' };
