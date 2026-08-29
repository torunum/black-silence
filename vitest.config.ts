import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Deliberately false. `true` means a discovery glob that ever matched
    // zero files would make `npm test` exit 0 having run nothing — the same
    // failure class as KNOWN-12's madge gate, which reported success while
    // scanning one file for five plans. A gate that passes without looking is
    // worse than no gate, because it gets quoted as evidence. Found by Plan
    // 0F's Task 12 review.
    passWithNoTests: false,
  },
});
