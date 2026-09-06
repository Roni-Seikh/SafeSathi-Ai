/**
 * SafeSathi design tokens.
 *
 * Direction: "a beacon at dusk." The app lives mostly in a quiet,
 * near-black indigo — the colour of a street after sunset, when SafeSathi
 * is actually needed — so that the one moment that should grab attention,
 * the SOS button, reads as a genuine flare against a calm background
 * instead of competing with a busy, saturated UI. Everything else stays
 * disciplined: glass surfaces, a restrained accent, no gradients or glow
 * anywhere except that single signature element.
 *
 * Typography: Sora (display) is geometric and a little unusual at large
 * sizes without being decorative — used sparingly for headings only.
 * Inter (body) is chosen purely for legibility under stress; this is a
 * safety app, not a brand showcase, and body text needs to be readable
 * one-handed, in the dark, in a hurry.
 */

export const colors = {
  // Base
  background: '#0A0D16',
  backgroundElevated: '#12172A',
  surface: '#161C33',

  // Glass (Material/glassmorphism cards over the dark background)
  glassFill: 'rgba(255,255,255,0.05)',
  glassFillStrong: 'rgba(255,255,255,0.09)',
  glassBorder: 'rgba(255,255,255,0.12)',

  // Brand — periwinkle-indigo, evokes dusk rather than a generic purple/blue
  primary: '#6C7BFF',
  primaryMuted: 'rgba(108,123,255,0.16)',

  // Guardian teal — "safe", positive, confirmation states
  safe: '#33D6B0',
  safeMuted: 'rgba(51,214,176,0.16)',

  // Caution — amber zones, warnings
  caution: '#FFC24B',
  cautionMuted: 'rgba(255,194,75,0.16)',

  // Flare coral — reserved ONLY for SOS/danger. Never used decoratively.
  danger: '#FF5D5D',
  dangerBright: '#FF8A65',
  dangerMuted: 'rgba(255,93,93,0.16)',

  // Text
  textPrimary: '#F3F5FA',
  textSecondary: 'rgba(243,245,250,0.64)',
  textTertiary: 'rgba(243,245,250,0.38)',
  textOnPrimary: '#0A0D16',
  textOnDanger: '#FFFFFF',

  overlay: 'rgba(4,6,12,0.72)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Font families — loaded via useFonts() in App.tsx (@expo-google-fonts).
 * Falls back to the system font automatically until fonts finish loading. */
export const fontFamily = {
  display: 'Sora_600SemiBold',
  displayBold: 'Sora_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

export const typography = {
  displayLarge: { fontFamily: fontFamily.displayBold, fontSize: 32, lineHeight: 40 },
  h1: { fontFamily: fontFamily.display, fontSize: 26, lineHeight: 34 },
  h2: { fontFamily: fontFamily.display, fontSize: 21, lineHeight: 28 },
  h3: { fontFamily: fontFamily.bodySemiBold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fontFamily.body, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fontFamily.bodyMedium, fontSize: 15, lineHeight: 22 },
  bodySmall: { fontFamily: fontFamily.body, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fontFamily.body, fontSize: 12, lineHeight: 16 },
  button: { fontFamily: fontFamily.bodySemiBold, fontSize: 15, lineHeight: 20 },
} as const;

/** Glassmorphic card surface — used by <GlassCard />. React Native has no
 * backdrop-filter, so the "glass" look comes from a semi-transparent fill
 * plus a hairline border, which reads correctly over the dark background
 * without needing blur support. */
export const glassCardStyle = {
  backgroundColor: colors.glassFill,
  borderColor: colors.glassBorder,
  borderWidth: 1,
  borderRadius: radii.lg,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 6,
  },
  /** The one deliberate glow in the whole app — the SOS beacon. */
  flare: {
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

const theme = { colors, spacing, radii, fontFamily, typography, glassCardStyle, shadow };
export default theme;
