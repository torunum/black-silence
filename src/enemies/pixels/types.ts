/**
 * The shape of one PXDEF entry — a creature's ASCII sprite rows plus the
 * palette that colours them, and optional attack/death frames for the
 * redesigned enemies that define them. Lives in its own module so
 * grunts.ts, demons.ts, bosses.ts and index.ts can all import it without
 * a cycle.
 */
export interface PixelDef {
  head?: number;
  px: string[];
  pal: Record<string, string>;
  atk?: string[];
  die1?: string[];
  die2?: string[];
}
