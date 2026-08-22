/** The playable piano's key elements and the rolling note history the RECITAL achievement checks. The piano's logic is Plan 0F; only its state moves here. */
export const pianoState: { keyEls: Record<number, HTMLElement>; noteHist: number[] } = { keyEls: {}, noteHist: [] };
