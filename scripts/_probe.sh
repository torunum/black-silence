#!/bin/bash
# usage: _probe.sh "<sweep secs>" frames [x z]  — runs the boss probe under each sweep period in parallel, logs in the scratchpad
export PATH="/c/Program Files/nodejs:$PATH"
cd /c/Users/ogulc/uygulamatesti
TMPD="/c/Users/ogulc/AppData/Local/Temp/claude/C--Users-ogulc-uygulamatesti/aa9a08b9-4230-4fc4-aa61-5f65e7b4089f/scratchpad"
for sw in $1; do
  ( PROBE_SWEEP=$sw PROBE_FRAMES=$2 PROBE_X=${3:-49} PROBE_Z=${4:-41} npx vitest run --no-cache tests/integration/_bossProbe.test.ts > "$TMPD/probe-$sw-${3:-49}-${4:-41}.log" 2>&1; echo EXIT=$? >> "$TMPD/probe-$sw-${3:-49}-${4:-41}.log" ) &
done
wait
echo done > "$TMPD/probe-all-${1// /_}.done"
