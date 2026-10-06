#!/bin/bash
# usage: _play.sh "<seeds>" [skill]   — runs the church play-through under each seed in parallel, logs in the scratchpad
export PATH="/c/Program Files/nodejs:$PATH"
cd /c/Users/ogulc/uygulamatesti
TMPD="/c/Users/ogulc/AppData/Local/Temp/claude/C--Users-ogulc-uygulamatesti/aa9a08b9-4230-4fc4-aa61-5f65e7b4089f/scratchpad"
for s in $1; do
  ( BOT_LOG=1 BOT_SEED=$s BOT_SKILL=${2:-usual} npx vitest run --no-cache tests/integration/churchPlay.test.ts > "$TMPD/seed$s-${2:-usual}.log" 2>&1; echo EXIT=$? >> "$TMPD/seed$s-${2:-usual}.log" ) &
done
wait
echo ALLDONE > "$TMPD/play-all-${1// /_}-${2:-usual}.done"
