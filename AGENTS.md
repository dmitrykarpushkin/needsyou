# Rules for an AI agent working in this repository

People read [README.md](README.md). This file is for coding agents (Claude Code reads it through `CLAUDE.md`, Codex and others read it
directly).

## What this is

A static React + Vite page that reads JSON files and shows one person what needs them. Reference: [docs/design.md](docs/design.md),
the data contract [docs/DATA.md](docs/DATA.md), commands [docs/development.md](docs/development.md).

## Rules

1. **The page never writes.** No POST, no local cache of data, no service worker caching. `src/data.ts` (polling) and `src/live.ts`
   (the optional SSE feed) are the only modules that talk to the network;
   pages get data from the store, never from `fetch` directly.
2. **Never invent a value.** A missing field is shown as unknown in plain words, not guessed. Estimates coming from an agent are labelled
   as that agent's own estimate.
3. **Ranking lives in pure functions** (`src/rank.ts`, `src/schedule.ts`, `src/shift.ts`, `src/backlogRows.mjs`). A change in what comes
   first on "Needs you" needs a test in `tests/` that shows the new order.
4. **Data contract changes go into `docs/DATA.md` in the same commit**, and `scripts/gen_demo.py` must produce demo files that use them.
   Run `python3 scripts/gen_demo.py` and commit the regenerated `public/demo/`; never hand-edit the demo JSON.
5. **Demo data is synthetic.** No real repository names, people, hosts, IP addresses, tokens or chat ids in `public/demo/`, screenshots
   or docs.
6. **Before you say done:** `npm test` and `npm run build` pass; for a visible change, retake the affected screenshots
   (`scripts/screenshots.mjs`) and look at them.
7. **README.md and README.ru.md are for people.** Keep them in step (same sections, same facts), at most one table, no internal jargon.
   Long reference goes into `docs/`.
