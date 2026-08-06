declare module 'culori' {
  export type Rgb = { mode: 'rgb'; r: number; g: number; b: number; alpha?: number };
  export type Hsl = { mode: 'hsl'; h: number; s: number; l: number; alpha?: number };

  export function wcagContrast(a: string, b: string): number;
  export function wcagLuminance(color: string): number;
  export function formatHex(color: string | object): string;
  export function formatHex8(color: string | object): string;
  export function formatRgb(color: string | object): string;
  export function formatHsl(color: string | object): string;
  export function formatCss(color: string | object): string;
  export function clampRgb(color: string | object): object;
  export function clampChroma(color: string | object, mode?: string, rgbGamut?: string): object;
  export function displayable(color: string | object): boolean;
  export function parseHex(color: string): { mode: 'rgb'; r: number; g: number; b: number; alpha?: number } | undefined;
  export function parseRgb(color: string): object | undefined;
  export function parseHsl(color: string): object | undefined;
  export function converter<T extends object>(mode: string): (color: string | object) => T;
  export function samples(count: number): string[];
  export function useMode(mode: object): object;
  export function nearest(colors: string[], metric?: string): (color: string | object) => string;

  export const modeRgb: object;
  export const modeHsl: object;
  export const modeOkhsl: object;
  export const modeOklch: object;
  export const modeLrgb: object;
  export const modeLab: object;
  export const modeLch: object;
}
