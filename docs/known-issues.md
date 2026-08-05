# Known Issues

Problems found during the port. Phase 0 preserves them deliberately — see the
non-goals in the Phase 0 spec. Each entry names the phase that owns the fix.

| ID | Issue | Owner |
|---|---|---|
| KNOWN-1 | Level 1 places a red key (`K`) and a Guardian miniboss guarding it, but the level contains no locked door (`D`) anywhere. The key is decorative. | Phase 4 — level rebuild |
| KNOWN-2 | `Context` is a service locator, used to make the mechanical port safe. Systems reach into each other through it instead of using `Events`. Each later phase migrates the systems it touches. | Phases 1–5 |
| KNOWN-3 | 17 non-gameplay `setTimeout` calls remain after Plan 0D. They must be cancelled on level unload. | Plan 0D |
