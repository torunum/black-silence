/**
 * Severed heads — kickable physics props spawned by decapitations. Declared
 * on the same `let` line as `gibs` in the reference (line 1596), which is
 * why REF.particlesDecalsGibs's doc comment disclaims it: its logic lives
 * with damage/death, not with the particle system, so it gets its own file
 * rather than joining src/fx/Gibs.ts.
 */
export const headPool: { heads: Array<Record<string, unknown>> } = { heads: [] };
