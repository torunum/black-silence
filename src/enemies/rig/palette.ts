import { makePalette, type Material, type Palette } from "../../render/viewmodel/palette";

/**
 * The enemy rig's palette: the weapons' shading (hard tones, one key light, a
 * rim on the top edges) with materials for flesh instead of steel. The
 * materials every monster shares — bone, wet meat, organs, a dark cavity,
 * a glowing eye — keep the same ids in every palette, so a stump looks the
 * same on every body; a monster adds its own skins and cloth after `FIRST_OWN`.
 * Id 1 is always the outline (`MAT.OUT`).
 *
 * Ramps run dark to light and are authored against the legacy sprites' own
 * colours (`src/enemies/pixels/`): each monster's tones bracket the hexes its
 * old art used, so the new body is recognisably the old one, drawn properly.
 */

export const E = {
  OUT: 1, BONE: 2, MEAT: 3, ORGAN: 4, CAVITY: 5, EYE: 6, TOOTH: 7, SINEW: 8,
} as const;
/** First id a monster's own materials may take. */
export const FIRST_OWN = 9;

/** The materials every monster has. */
export const SHARED: Record<number, Material> = {
  [E.OUT]:    { ramp: ["#07060a", "#0d0b10", "#15121a"], amb: 1 },
  // pale grey-green bone, like the ghoul's old `b`
  [E.BONE]:   { ramp: ["#1e2018", "#363929", "#575b42", "#7b8160", "#a0a681", "#c4c9a4", "#e2e6c6"], amb: .26, spec: .15 },
  // wet raw meat: dark crimson to a glistening red
  [E.MEAT]:   { ramp: ["#1c0504", "#34080a", "#520f0a", "#741810", "#982615", "#b93a22", "#d9603f"], amb: .24, spec: .55, rim: true },
  // viscera: a purple that goes pink where the light finds it
  [E.ORGAN]:  { ramp: ["#220a12", "#401424", "#601f36", "#822e4a", "#a8465e", "#cc6d80", "#eba0ab"], amb: .24, spec: .6, rim: true },
  // the dark inside of a body: nearly flat, never lit
  [E.CAVITY]: { ramp: ["#060304", "#0d0607", "#170b0a", "#22100d"], amb: .55 },
  // a glowing eye: emissive, bright
  [E.EYE]:    { ramp: ["#33420a", "#668a18", "#9cc42c", "#cdee58", "#f1ffa6"], emissive: true },
  // yellowed teeth and claws
  [E.TOOTH]:  { ramp: ["#241d10", "#453a20", "#6e5f36", "#9a8a56", "#c4b57e", "#e6dba8"], amb: .24, spec: .25, rim: true },
  // tendon and gristle
  [E.SINEW]:  { ramp: ["#150b09", "#281613", "#3e2420", "#573630", "#744a42"], amb: .28 },
};

/** A palette of the shared materials and a monster's own. */
export function enemyPalette(own: Record<number, Material>): Palette {
  return makePalette({ ...SHARED, ...own });
}
