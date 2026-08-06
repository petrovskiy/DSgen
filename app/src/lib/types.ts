export interface StyleEffects {
  blur: boolean | { enabled: boolean; strength: string };
  glassmorphism: boolean;
  noise: boolean | { enabled: boolean; opacity: string };
  glow: boolean | { enabled: boolean; intensity: string };
}

export interface StyleBorders {
  thickness: string;
  style: string;
}

export interface StyleAnimation {
  style: string;
  fast: string;
  normal: string;
  slow: string;
  easing: string;
}

export interface ComponentStyle {
  button: { ghost: string; destructive: string };
  navigation: { style: string; height: string };
  modal: { width: string };
  badge: { variants: string[] };
}

export interface DensityConfig {
  ui: string;
  info: string;
}

export interface ImagesStyle {
  photoStyle: string;
  illustrationStyle: string;
}

export interface IconsConfig {
  strokeWidth: number;
}

export interface LayoutConfig {
  maxWidth: string;
}

export interface StyleConfig {
  effects: StyleEffects;
  borders: StyleBorders;
  animation: StyleAnimation;
  components: ComponentStyle;
  density: DensityConfig;
  images: ImagesStyle;
  icons: IconsConfig;
  letterSpacing: { heading: string; body: string };
  layout: LayoutConfig;
}

export interface Concept {
  id: string;
  name: string;
  color: string;
  icon: string;
  desc: string;
  radius: number[];
  shadow: string;
  scale: string;
  space: number;
  paletteIds: string[];
  allowedPaletteIds: string[];
  fontPairIds: string[];
  allowedFontPairIds: string[];
  styleConfig: StyleConfig;
}

export interface SemanticColors {
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ColorSystem {
  mode: 'light' | 'dark';
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  semantic: SemanticColors;
}

export interface Palette {
  id: string;
  name: string;
  colors: string[];
  colorSystem?: ColorSystem;
  sourcePalette?: string[];
  primaryMode?: 'light' | 'dark';
  colorSystemAlt?: ColorSystem;
  _colorSystemAlt?: ColorSystem;
}

export interface FontData {
  family: string;
  css: string;
}

export interface FontPair {
  id: string;
  name: string;
  heading: string;
  body: string;
  hw: number;
  bw: number;
  note: string;
}

export interface FontsData {
  fonts: FontData[];
  pairs: FontPair[];
}

export interface TypeScale {
  title: number;
  body: number;
}

export interface ShadowSet {
  subtle: string;
  medium: string;
  focus: string;
}

export interface WizardState {
  step: number;
  conceptId: string | null;
  paletteId: string | null;
  fontPairId: string | null;
  headingFont: string;
  bodyFont: string;
  themeMode: 'light' | 'dark' | null;
  shellTheme: 'light' | 'dark';
}
