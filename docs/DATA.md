# Data contract

The console is a static page. It never writes anything; it only reads JSON files and re-reads them on a timer.
Anything that can serve files over HTTP can be the backend: a cron job writing into an nginx folder, an S3 bucket, a small API.

## Where the files come from

Set at build time (Vite env variables, see `.env.example`):

| Variable | Default | Meaning |
|---|---|---|
| `VITE_DATA_SOURCE` | `demo` | `demo` reads `public/demo/*`; `http` reads your backend |
| `VITE_DATA_URL` | `./` | base URL of the files in `http` mode (relative to the page, or absolute) |
| `VITE_LIVE_FEED` | off | `1` also listens to Server-Sent Events at `<VITE_DATA_URL>live/events` |
| `VITE_TIME_ZONE` | browser's (UTC in demo mode) | IANA zone for clocks and the schedule axis, e.g. `Europe/Berlin` |

In `demo` mode the timestamps are moved so the demo always looks current. Heartbeats, requests, PRs and Lab steps move by the exact
`now - 2026-10-26T09:00:00Z`. Scheduled things (the journal, routine `last_run`) move by whole days, so a job scheduled for 02:00 still ran at
02:00; journal events that would land in the future are dropped, and the `runs` of each service are recomputed from the shifted journal.
The demo schedules are written in UTC, so the demo shows UTC unless `VITE_TIME_ZONE` is set. `scripts/gen_demo.py` regenerates the demo
files from one table of server timers, so `schedules.json`, `services.json` and the journal agree.

In `http` mode the `Last-Modified` header of each file is used for the "stale" badges (over 15 minutes old).
The SSE feed, if enabled, sends events named `state` with body `{"parts": {"agents.json": {...}, "prs.json": {...}}}`;
a part present in the feed replaces the polled file until the feed goes quiet for 90 seconds.

## Conventions

- Timestamps are ISO 8601 UTC strings (`2026-10-26T08:57:00Z`).
- Every field not marked *required* may be missing; the page shows less, never breaks.
- Text fields are shown as written. Write them as one plain sentence for a person, not as a log line.
- Polling: `agents.json` every 20 s (and `lab.json` on the Agents page); `agent-info.json` and `schedules.json` every 5 min; the rest every 1-2 min.

## Files

### `console.json` (required, loaded before the app mounts)

```json
{
  "generated": "2026-10-26T08:57:00Z",
  "owner": { "login": "demo-owner", "name": "Demo Owner" },
  "projects": [
    { "id": "api-service", "name": "API service", "color": "#7C66DC", "icon": "◆",
      "blocking": true, "shared": false, "repos": ["example/api-service"],
      "links": [{ "name": "Staging", "url": "https://staging.example.com", "about": "staging deploy" }] }
  ]
}
```

- `owner.login`: the GitHub login of the person; decides which PRs are "yours" and which reviews are requested from you.
- `projects`: order matters. It is the sidebar order and the tie-breaker of the "Needs you" ranking (first = most expensive when stalled).
- `blocking`: a review requested from you, or a session waiting for you, in this project ranks first and is marked "Work is stopped".
- `shared`: a team repo; only your own ready PRs are listed as yours to merge, and only your own merged PRs are listed.
- `generated`: shown at the bottom of the sidebar ("data from 3 min ago"); over 15 minutes old it turns amber.

### `asks.json`: requests that agents wrote down for the owner

```json
{ "asks": [ { "id": "a1", "project": "api-service", "text": "Choose the rate-limit policy ...", "priority": 1, "status": "open", "added": "..." } ] }
```

`priority`: 1 = work stops until you answer (ranked first), 2 = normal, 3 = background (hidden after 14 days). Only `status: "open"` is shown.

### `prs.json`: pull requests per project (read-only collector output)

```json
{ "built": "...", "projects": { "api-service": { "repo": "example/api-service",
  "open": [ { "n": 214, "title": "...", "url": "...", "draft": false, "why": "first sentence of the description",
              "author": "demo-owner", "updated": "...", "age_days": 2, "base": "main", "repo": "example/api-service",
              "waiting": [ { "k": "ready" } ], "done": 6, "total": 6 } ],
  "merged": [ { "n": 209, "title": "...", "url": "...", "merged_at": "...", "author": "demo-owner" } ],
  "error": "set instead of the lists when the collector failed" } } }
```

`waiting[].k` is one of `ready` (green checks and approved), `review` (with `who`: logins asked to review), `changes`, `red`, `running`, `draft`, `review_wait`.
`done`/`total` are the checked and total checklist items of the PR description. `repo` on a PR is needed only when a project has several repos.

### `agents.json`: heartbeats of agent sessions

```json
{ "agents": [ { "id": "s-api-orders", "title": "Orders pagination", "project": "api-service", "status": "working",
                "task": "what it does now, one sentence", "waiting_on": "what it needs from you", "updated": "...", "progress": 35 } ] }
```

`status`: `working`, `waiting` (shown in "Needs you" for 4 days if `waiting_on` is set), or `done`. A `working` session silent for over 60 minutes is shown as "silent".
`progress` is the session's own estimate and is labelled as such.

### `agent-info.json`: hand-written descriptions

```json
{ "agents": { "lab:triage": { "name": "Triage", "what": "...", "when": "Every 30 minutes while ideas wait." },
              "thread:<agents.json id>": { "name": "...", "what": "..." },
              "service:<services.json id>": { "what": "...", "when": "..." } } }
```

Optional; without an entry a row shows its own title and status only.

### `work.json`: tasks in progress, with the roles working on them

```json
{ "work": [ { "id": "w-orders", "project": "api-service", "state": "open", "title": "Paginate /orders",
              "status": "one line: where it stands", "summary": "...", "changed": "what changed since last time",
              "roles": [ { "name": "Builder", "does": "cursor pagination", "state": "going", "note": "2 of 7 criteria" } ],
              "pr": { "n": 221, "state": "draft" }, "plan": { "done": 2, "total": 7 } } ] }
```

`state: "closed"` hides the item. Role `state`: `going`, `done`, `waiting`, `error`. `pr.state`: `draft`, `review`, `merged`.

### `backlog.json`

```json
{ "project": "api-service", "order": ["api/b2", "api/b1"],
  "modules": [ { "module": "api", "todo": [ { "id": "b1", "phrase": "Decide whether ...", "act": "me", "level": 5, "status": "doing" } ] } ] }
```

- `phrase`: the plain-language line shown; items without it are only counted.
- `act`: `me` (needs the owner), `agent`, `wait`. `level`: 5, 4 or 3 (or `value`, clamped to 3..5). Level-5 `me` items also join "Needs you".
- `order`: optional list of `module/id`; otherwise higher `value` first. `project`: where backlog rows land in "Needs you" (default: the first project).

### `lab.json`: ideas going through a chain of agent roles

```json
{ "project": "research", "updated": "...",
  "stages": [ { "id": "triage", "role": "triage", "waiting": 3 } ],
  "totals": { "ideas": 9, "active": 3, "parked": 2, "dropped": 1, "done": 3 },
  "ideas": [ { "id": "idea-001", "title": "machine-title", "phrase": "Cache tool results across retries", "why": "...",
               "priority": 1, "state": "done", "submitted_by": "news-scout", "submitted_at": "...", "done_at": "...",
               "steps": [ { "role": "triage", "verdict": "go", "ts": "..." } ], "last": { "ts": "..." } } ] }
```

The `lab/board.json` written by [agent-lab](https://github.com/dmitrykarpushkin/agent-lab) (`lab.py export`) has this shape and can be served as `lab.json` as is;
it has no `phrase`/`why`, so the page shows `title`.

`state`: `active`, `parked` (waits for the owner; counted in "Needs you"), `done`, `dropped`. Submitters named `news-scout` and `scout-*` appear as the two scout rows on the Agents page.
Verdicts with a wording: triage `go|drop|park`, method `ok`, builder/tester/applier/validator `ok|fail`, retro `worked|partly|failed`.

### `services.json`: background services and their recent runs

```json
{ "services": [ { "id": "backup", "name": "Nightly backup", "about": "...", "schedule": "daily 02:00",
                  "always_on": false, "running_since": null, "planned": false, "kind": "job",
                  "runs": [ { "ts": "...", "ok": false, "dur": 41 } ] } ] }
```

`runs` newest first, `dur` in seconds. A service whose newest run has `ok: false` is "broken now" on every page.
`kind: "storage"` and `planned: true` are hidden from the Agents list.

### `checks.json`

`{ "ok": true, "at": "..." }`. `ok: false` adds "repository checks are red" to the broken line on the home screen.

### `schedules.json`

```json
{ "timers":   [ { "name": "Sentinel", "schedule": "every 10 min", "does": "...", "project": "api-service", "expect_every_hours": 0.17 } ],
  "routines": [ { "name": "Morning digest", "schedule": "daily 06:00", "does": "...", "project": "api-service",
                  "last_run": "...", "last_result": "sent, 4 items", "note": "shown in amber" } ] }
```

`schedule` phrases understood (case-insensitive): `daily 07:30[, 19:30]`, `every N min`, `every N h [HH:MM-HH:MM]`, `hourly at :MM`,
`mon, thu 09:00` (any weekday names or 3-letter forms), `once YYYY-MM-DD at HH:MM`, `on demand`, `no schedule`.
Schedules that fire every 15 minutes or more often are drawn as a band; sparser ones as one tick per run.
Anything else falls back to `expect_every_hours` (timers only), then to "on event". Times are wall-clock times in `VITE_TIME_ZONE`.

### `wiring.json`: what the agents run with

```json
{ "items": [ { "id": "skill-review", "kind": "skill", "name": "code-review", "path": "skills/code-review/SKILL.md",
               "source": "user", "fires": "on request", "about": "one line", "text": "full file text or null",
               "truncated": false, "status": "on", "tools": 24, "transport": "http", "note": "shown when text is null" } ] }
```

`kind`: `instruction`, `skill`, `hook`, `mcp`. Markdown text is rendered (headings, lists, code, quotes, tables, front matter, `@file` imports).
**Mask secrets before writing this file**: the page shows the text as given.

### `journal/<YYYY-MM-DD>.jsonl`: run events, one JSON object per line, one file per UTC day

```json
{"ts":"2026-10-26T08:50:00Z","run":"sentinel-1","service":"sentinel","event":"end","ok":true,"duration_s":3.1}
{"ts":"2026-10-26T08:30:00Z","run":"lab-runner-3","service":"lab-runner","event":"skip","reason":"nothing to do"}
```

The Activity page reads the last three days, counts `end` events per hour (`ok: false` = failed) and `skip` events, ignores `start`,
and shows only services listed in `services.json`. In demo mode the journal is one file, `public/demo/journal.jsonl`.
