import type { PixelDef } from "./types";
import { GRUNTS } from "./grunts";
import { DEMONS } from "./demons";
import { BOSSES } from "./bosses";

/**
 * Pixel-art sprite definitions, keyed by the grid character that spawns the
 * creature. Rows are ASCII; each character indexes into that creature's
 * palette. Split into three files purely for size — the ranges are contiguous
 * and key order matches the reference exactly.
 */
export const PXDEF: Record<string, PixelDef> = { ...GRUNTS, ...DEMONS, ...BOSSES };
export type { PixelDef };
