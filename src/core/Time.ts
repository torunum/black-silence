/**
 * The scaled clock. Today this holds only the deltas the loop computes;
 * `schedule()` arrives in Task 5, when the four gameplay `setTimeout` calls
 * that ignore hit-stop and pause (KNOWN-3) move onto it. It is created a task
 * early, with two fields, so that task changes one file instead of two.
 */
export const time = { dt: 0, scaledDt: 0 };
