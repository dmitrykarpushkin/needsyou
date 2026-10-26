#!/usr/bin/env python3
"""Writes the synthetic demo data in public/demo/. Deterministic: run it again and the files come out the same.

All timestamps are written relative to ANCHOR (the same moment as DEMO_ANCHOR in src/config.ts). In demo mode the page moves every
timestamp by (now - ANCHOR), so "12 minutes ago" in these files stays "12 minutes ago" whenever the page is opened.
Usage: python3 scripts/gen_demo.py
"""
import datetime as dt, json, pathlib, random

ANCHOR = dt.datetime(2026, 10, 26, 9, 0, tzinfo=dt.timezone.utc)
OUT = pathlib.Path(__file__).resolve().parent.parent / "public" / "demo"
OWNER = "demo-owner"


def t(minutes_ago: float) -> str:
    return (ANCHOR - dt.timedelta(minutes=minutes_ago)).strftime("%Y-%m-%dT%H:%M:%SZ")


def d(days_from_anchor: int) -> str:
    return (ANCHOR + dt.timedelta(days=days_from_anchor)).strftime("%Y-%m-%d")


def write(name, data):
    (OUT / name).write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


console = {
    "generated": t(3),
    "owner": {"login": OWNER, "name": "Demo Owner"},
    "projects": [
        {"id": "api-service", "name": "API service", "color": "#7C66DC", "icon": "◆", "blocking": True, "repos": ["example/api-service"],
         "links": [{"name": "Staging", "url": "https://staging.example.com", "about": "staging deploy of the API"}]},
        {"id": "research", "name": "Research", "color": "#12A87A", "icon": "▲", "repos": ["example/research-notes"]},
        {"id": "home-automation", "name": "Home automation", "color": "#0EA5E9", "icon": "●", "repos": ["example/home-automation"]},
    ],
}

asks = {"asks": [
    {"id": "a1", "project": "api-service", "priority": 1, "status": "open", "added": t(95),
     "text": "Choose the rate-limit policy for the public API: per key (simpler) or per key and per IP (safer). The migration waits for this."},
    {"id": "a2", "project": "research", "priority": 2, "status": "open", "added": t(60 * 20),
     "text": "Approve spending up to $15 on the long-context benchmark run (about 400 tasks, two models)."},
    {"id": "a3", "project": "home-automation", "priority": 3, "status": "open", "added": t(60 * 30),
     "text": "Say whether the thermostat schedule may change on weekends."},
    {"id": "a4", "project": "api-service", "priority": 2, "status": "closed", "added": t(60 * 50), "text": "Pick a name for the new endpoint."},
]}

prs = {"built": t(4), "projects": {
    "api-service": {"repo": "example/api-service", "open": [
        {"n": 214, "title": "Add per-key rate limiting middleware", "url": "https://github.com/example/api-service/pull/214", "draft": False,
         "why": "Protects the public API from bursty clients without touching the handlers.", "author": OWNER, "updated": t(40), "age_days": 2,
         "waiting": [{"k": "ready"}], "done": 6, "total": 6, "base": "main"},
        {"n": 219, "title": "Move session storage to Redis", "url": "https://github.com/example/api-service/pull/219", "draft": False,
         "why": "Sessions survive a restart and can be shared by two replicas.", "author": "teammate-a", "updated": t(130), "age_days": 1,
         "waiting": [{"k": "review", "who": [OWNER]}], "done": 3, "total": 5, "base": "main"},
        {"n": 221, "title": "Paginate the /orders endpoint", "url": "https://github.com/example/api-service/pull/221", "draft": True,
         "why": "Large accounts time out on the unpaginated list.", "author": OWNER, "updated": t(12), "age_days": 0,
         "waiting": [{"k": "running"}], "done": 2, "total": 7, "base": "main"},
    ], "merged": [
        {"n": 209, "title": "Return 422 instead of 500 on bad JSON", "url": "https://github.com/example/api-service/pull/209", "merged_at": t(60 * 26), "author": OWNER},
        {"n": 205, "title": "Structured request logging", "url": "https://github.com/example/api-service/pull/205", "merged_at": t(60 * 70), "author": OWNER},
    ]},
    "research": {"repo": "example/research-notes", "open": [
        {"n": 37, "title": "Analysis: retrieval vs long context on 400 tasks", "url": "https://github.com/example/research-notes/pull/37", "draft": False,
         "why": "Compares the two approaches on the same task set with the same grader.", "author": OWNER, "updated": t(300), "age_days": 3,
         "waiting": [{"k": "changes"}], "done": 4, "total": 9, "base": "main"},
    ], "merged": [
        {"n": 35, "title": "Grader prompt v3 with rubric", "url": "https://github.com/example/research-notes/pull/35", "merged_at": t(60 * 50), "author": OWNER},
    ]},
    "home-automation": {"repo": "example/home-automation", "open": [], "merged": [
        {"n": 18, "title": "Retry the MQTT connection with backoff", "url": "https://github.com/example/home-automation/pull/18", "merged_at": t(60 * 30), "author": OWNER},
    ]},
}}

agents = {"agents": [
    {"id": "s-api-ratelimit", "title": "Rate limiting rollout", "project": "api-service", "status": "waiting", "updated": t(25), "progress": 70,
     "task": "Middleware is merged behind a flag; the migration of existing keys is prepared", "waiting_on": "the choice of rate-limit policy (per key or per key and IP)."},
    {"id": "s-api-orders", "title": "Orders pagination", "project": "api-service", "status": "working", "updated": t(6), "progress": 35,
     "task": "Writing cursor pagination for /orders and the contract tests for it"},
    {"id": "s-research-bench", "title": "Benchmark runner", "project": "research", "status": "working", "updated": t(14), "progress": 55,
     "task": "Re-running the grader on the 40 tasks where two judges disagreed"},
    {"id": "s-home-sensors", "title": "Sensor dashboard", "project": "home-automation", "status": "working", "updated": t(140), "progress": 20,
     "task": "Mapping the humidity sensors to rooms"},
    {"id": "s-research-lit", "title": "Literature sweep", "project": "research", "status": "done", "updated": t(60 * 9), "progress": 100,
     "task": "Summarised 12 papers on agent self-verification"},
]}

info = {"agents": {
    "lab:news-scout": {"name": "News scout", "what": "Reads a fixed list of engineering blogs and release notes and submits ideas worth trying, each with a source link.", "when": "When a session asks it for fresh ideas."},
    "lab:scout": {"name": "Code scouts", "what": "Walk one area of the code each and submit small fixes they think are worth doing, each with a file and line.", "when": "Twice a week."},
    "lab:triage": {"name": "Triage", "what": "Checks that an idea has a source and is worth the work; takes it, drops it, or parks it for your word.", "when": "Every 30 minutes while ideas wait."},
    "lab:method": {"name": "Method picker", "what": "Chooses how deep the written plan must be for the size of the change.", "when": "After triage takes an idea."},
    "lab:builder": {"name": "Builder", "what": "Makes the change on a branch, following the plan.", "when": "When an idea has a method."},
    "lab:tester": {"name": "Tester", "what": "Runs the tests and the checks against the builder's branch.", "when": "After each build."},
    "lab:applier": {"name": "Applier", "what": "Merges a tested change into the main branch once the plan allows it.", "when": "After the tester passes."},
    "lab:retro": {"name": "Retro", "what": "Records whether the chosen method worked, so the next pick is better informed.", "when": "After validation."},
    "lab:validator": {"name": "Validator", "what": "A fresh agent that did not see the builder's reasoning checks the result against the plan's criteria.", "when": "Last, before an idea counts as shipped."},
    "thread:s-api-ratelimit": {"name": "Rate limiting rollout", "what": "Rolls out per-key rate limiting on the public API."},
    "thread:s-research-bench": {"name": "Benchmark runner", "what": "Runs the retrieval vs long-context benchmark and keeps the grader honest."},
    "service:sentinel": {"what": "Watches the other services and opens an ask when one of them fails twice in a row."},
}}

work = {"work": [
    {"id": "w-orders", "project": "api-service", "state": "open", "title": "Paginate /orders",
     "status": "Builder is writing cursor pagination; tests are next.",
     "summary": "Large accounts time out on the unpaginated order list. The change adds a cursor and keeps the old call working for one release.",
     "changed": "the contract tests for the old call are green.",
     "roles": [{"name": "Planner", "does": "wrote 7 acceptance criteria", "state": "done"},
               {"name": "Builder", "does": "cursor pagination", "state": "going", "note": "2 of 7 criteria"},
               {"name": "Verifier", "does": "checks every criterion with fresh eyes", "state": "waiting"}],
     "pr": {"n": 221, "state": "draft"}, "plan": {"done": 2, "total": 7}},
    {"id": "w-bench", "project": "research", "state": "open", "title": "Retrieval vs long context",
     "status": "Re-grading the 40 tasks where two judges disagreed.",
     "roles": [{"name": "Runner", "does": "ran 400 tasks on two models", "state": "done"},
               {"name": "Grader", "does": "second pass on disagreements", "state": "going"},
               {"name": "Reviewer", "does": "reads the analysis against the question", "state": "waiting"}],
     "pr": {"n": 37, "state": "review"}, "plan": {"done": 4, "total": 9}},
]}

backlog = {"project": "api-service", "order": [], "modules": [
    {"module": "api", "todo": [
        {"id": "b1", "phrase": "Decide whether the API keeps supporting the v1 auth header after March.", "act": "me", "level": 5},
        {"id": "b2", "phrase": "Add an alert when the p95 latency of /orders is over 800 ms for 10 minutes.", "act": "agent", "level": 5, "status": "doing"},
        {"id": "b3", "phrase": "Replace the hand-written OpenAPI file with one generated from the handlers.", "act": "agent", "level": 4},
        {"id": "b4", "phrase": "Give the staging database its own credentials instead of sharing the CI ones.", "act": "me", "level": 4},
        {"id": "b5", "phrase": "Remove the unused /legacy/export endpoint.", "act": "agent", "level": 3},
        {"id": "b6", "title": "refactor-errors-module", "act": "agent", "level": 3},
    ]},
    {"module": "agents", "todo": [
        {"id": "b7", "phrase": "Let the verifier read the CI logs directly instead of a copy pasted by the builder.", "act": "agent", "level": 4},
        {"id": "b8", "phrase": "Turn off the nightly lint routine: the pre-push hook already runs it.", "act": "me", "level": 3},
        {"id": "b9", "phrase": "Wait for the model provider to publish batch pricing before re-running the benchmark.", "act": "wait", "level": 3},
        {"id": "b10", "phrase": "Archive heartbeats older than 30 days.", "act": "agent", "level": 3},
    ]},
]}

STAGES = [("triage", "triage", 3), ("method", "method", 1), ("build", "builder", 0), ("test", "tester", 0), ("apply", "applier", 0), ("validate", "validator", 0), ("retro", "retro", 0)]
ideas = []
def idea(i, phrase, state, why=None, prio=3, by="news-scout", sub=600, steps=(), done=None):
    ideas.append({"id": f"idea-{i:03d}", "title": phrase.lower().replace(" ", "-")[:48], "phrase": phrase, "why": why, "priority": prio,
                  "state": state, "submitted_by": by, "submitted_at": t(sub), "done_at": t(done) if done is not None else None,
                  "steps": [{"role": r, "verdict": v, "ts": t(m)} for r, v, m in steps],
                  "last": {"ts": t(steps[-1][2])} if steps else None})
idea(1, "Cache tool results across retries of the same step", "done", "Retries re-ran the same slow searches; caching cut a typical retry from 40 s to 6 s.", 1, "scout-api", 60 * 70,
     [("triage", "go", 60 * 69), ("builder", "ok", 60 * 60), ("tester", "ok", 60 * 59), ("validator", "ok", 60 * 50)], 60 * 50)
idea(2, "Give the verifier the plan's criteria, never the builder's notes", "done", "Keeps the check independent: the verifier cannot be talked into agreeing.", 1, "news-scout", 60 * 120,
     [("triage", "go", 60 * 119), ("builder", "ok", 60 * 100), ("validator", "ok", 60 * 98)], 60 * 98)
idea(3, "Stop a session that has not reported for two hours and open an ask", "done", None, 2, "scout-agents", 60 * 150,
     [("triage", "go", 60 * 149), ("builder", "ok", 60 * 140), ("validator", "ok", 60 * 139)], 60 * 139)
idea(4, "Run the pre-push checks in parallel", "active", "The hook takes 3 minutes; most checks are independent.", 2, "scout-ci", 300,
     [("triage", "go", 280), ("method", "ok", 22)])
idea(5, "Summarise each night's failures in one morning message", "active", None, 2, "news-scout", 200, [("triage", "go", 18)])
idea(6, "Price every agent run and show the spend per project", "parked", "Needs a decision: which runs count as one project's spend.", 1, "news-scout", 60 * 6, [("triage", "park", 60 * 5)])
idea(7, "Let agents open draft PRs in the shared team repo", "parked", "Touches a repo other people use; needs your yes.", 2, "scout-api", 60 * 9, [("triage", "park", 60 * 8)])
idea(8, "Try a smaller model for triage", "active", None, 3, "scout-cli", 9, [])
idea(9, "Record a short video of each UI change", "dropped", None, 3, "news-scout", 60 * 30, [("triage", "drop", 60 * 29)])
lab = {"project": "research", "updated": t(9), "stages": [{"id": i, "role": r, "waiting": w} for i, r, w in STAGES],
       "totals": {s: sum(1 for i in ideas if i["state"] == s) for s in ("active", "parked", "dropped", "done")}, "ideas": ideas}
lab["totals"]["ideas"] = len(ideas)

# Server timers: one table feeds schedules.json, services.json and the journal, so the three always agree.
# (id, name, schedule phrase, minutes of the day it fires at (UTC, matching the phrase), typical duration s, project, what it does)
def every(step, start=0, stop=1439):
    return list(range(start, stop + 1, step))
TIMERS = [
    ("sentinel", "Sentinel", "every 10 min", every(10), 3, "api-service", "Checks the other services and opens an ask after two failures in a row."),
    ("pr-collector", "PR collector", "every 5 min", every(5), 10, "api-service", "Reads open and merged pull requests of every project into prs.json (read-only)."),
    ("lab-runner", "Lab runner", "every 30 min", every(30), 240, "research", "Moves Lab ideas one step along the chain."),
    ("backup", "Nightly backup", "daily 02:00", [120], 380, "home-automation", "Backs up the notes and the data files to object storage."),
    ("thermostat", "Thermostat sync", "every 2 h 06:00-22:00", every(120, 360, 1320), 4, "home-automation", "Pushes the heating schedule to the thermostat."),
    ("log-rotation", "Log rotation", "hourly at :15", every(60, 15), 2, "api-service", "Rotates and compresses service logs."),
]


def failed(sid, ts):
    """Deterministic failures: the PR collector fails once a day at 21:00; the backup fails from the anchor day on (so it is "broken now")."""
    if sid == "pr-collector":
        return ts.hour == 21 and ts.minute == 0
    if sid == "backup":
        return ts.date() >= ANCHOR.date()
    return False


# journal: every run of every timer from three days before the anchor to one day after it. In demo mode the page shifts the journal
# by whole days (so times of day stay as scheduled) and drops events that are still in the future.
rnd = random.Random(7)
lines = []
day0 = ANCHOR.replace(hour=0, minute=0, second=0)
for sid, name, phrase, mins, dur, project, does in TIMERS:
    k = 0
    for day in range(-3, 2):
        for m in mins:
            ts = day0 + dt.timedelta(days=day, minutes=m)
            if ts > ANCHOR + dt.timedelta(days=1):
                continue
            k += 1
            ok = not failed(sid, ts)
            ev = {"ts": ts.strftime("%Y-%m-%dT%H:%M:%SZ"), "run": f"{sid}-{k}", "service": sid, "event": "end", "ok": ok,
                  "duration_s": round(dur * (0.7 + rnd.random() * 0.6), 1)}
            if not ok:
                ev["note"] = "exit code 1"
            lines.append(ev)
lines.sort(key=lambda e: e["ts"])


def last_runs(sid, n=5):
    """The newest runs of a service as of the anchor (the page recomputes them from the journal in demo mode)."""
    mine = [e for e in lines if e["service"] == sid and e["ts"] <= t(0)]
    return [{"ts": e["ts"], "ok": e["ok"], "dur": e["duration_s"]} for e in reversed(mine[-n:])]


services = {"services": [
    *[{"id": sid, "name": name, "about": does, "schedule": phrase, "runs": last_runs(sid)} for sid, name, phrase, mins, dur, project, does in TIMERS],
    {"id": "live-feed", "name": "Live feed", "about": "Pushes changed data files to open consoles over Server-Sent Events.", "always_on": True, "runs": []},
    {"id": "archive", "name": "Archive", "kind": "storage", "about": "Storage, not a job.", "runs": []},
]}

checks = {"ok": True, "at": t(30)}

schedules = {
    "timers": [{"name": name, "schedule": phrase, "does": does, "project": project} for sid, name, phrase, mins, dur, project, does in TIMERS],
    "routines": [
        {"name": "Morning digest", "schedule": "daily 06:00", "does": "One morning message: what broke, what shipped, what waits for you.", "project": "api-service", "last_run": t(60 * 3), "last_result": "sent, 4 items"},
        {"name": "Docs link check", "schedule": "daily 06:30", "does": "Checks the links in the docs and opens an ask for broken ones.", "project": "api-service", "last_run": t(150), "last_result": "no broken links"},
        {"name": "Weekly review", "schedule": "mon 08:00", "does": "Writes what moved this week per project and what stalled.", "project": "research"},
        {"name": "Dependency audit", "schedule": "tue, fri 07:00", "does": "Lists outdated and vulnerable dependencies; opens an ask, never a PR.", "project": "api-service", "note": "Last week it hit the API rate limit once."},
        {"name": "Benchmark re-run", "schedule": "once 2026-10-28 at 10:00", "does": "Re-runs the benchmark after the grader fix.", "project": "research"},
        {"name": "Incident write-up", "schedule": "on demand", "does": "Drafts an incident note from the journal when asked.", "project": "api-service"},
    ],
}

wiring = {"items": [
    {"id": "inst-root", "kind": "instruction", "name": "AGENTS.md (root)", "path": "AGENTS.md", "source": "api-service", "fires": "every session", "about": "Roles, the definition of done, and what needs the owner's yes.",
     "text": "# Rules for every agent\n\n## Done means\n- every plan criterion passed, with the output attached\n- a fresh verifier that did not see your reasoning found no gap\n- nothing outside the task changed\n\n## Ask first\nMoney, messages to people, production, deletions: wait for an explicit **yes**.\n\n@docs/STYLE.md\n"},
    {"id": "inst-style", "kind": "instruction", "name": "STYLE.md", "path": "docs/STYLE.md", "source": "api-service", "fires": "imported", "about": "Code style and commit rules.",
     "text": "# Style\n\n- Small commits, one idea each.\n- Tests next to the code they test.\n- No new dependency without a line in the PR saying why.\n"},
    {"id": "skill-review", "kind": "skill", "name": "code-review", "path": "skills/code-review/SKILL.md", "source": "user", "fires": "on request", "about": "Reviews a diff for correctness, then for simplicity.",
     "text": "---\nname: code-review\ndescription: Review the current diff for bugs first, style second.\n---\n\n# Code review\n\n1. Read the diff and the plan.\n2. List correctness problems with file and line.\n3. Only then list simplifications.\n\n| Verdict | Meaning |\n|---|---|\n| pass | no correctness problem found |\n| fail | at least one |\n"},
    {"id": "skill-papercut", "kind": "skill", "name": "log-papercut", "path": "skills/log-papercut/SKILL.md", "source": "user", "fires": "when a side defect is noticed", "about": "Records a defect outside the task once, instead of fixing it silently.", "text": "# Log a papercut\n\nWrite one line to the backlog with where you saw it and why it matters. Do not fix it in the current task.\n"},
    {"id": "hook-prepush", "kind": "hook", "name": "pre-push", "path": ".githooks/pre-push", "source": "api-service", "fires": "before every push", "about": "Runs the tests and checks; refuses a red push.", "text": "#!/bin/sh\nset -e\nnpm test\nnpm run typecheck\n"},
    {"id": "hook-settings", "kind": "hook", "name": "settings.json", "path": ".claude/settings.json", "source": "api-service", "fires": "every session", "about": "Allowed commands and the session-start hook.", "text": "{\n  \"permissions\": { \"allow\": [\"Bash(npm test)\", \"Bash(npm run typecheck)\"] },\n  \"hooks\": { \"SessionStart\": [{ \"command\": \"sh scripts/session-start.sh\" }] }\n}\n"},
    {"id": "mcp-github", "kind": "mcp", "name": "GitHub", "path": "", "source": "connector", "fires": "", "status": "on", "tools": 24, "transport": "http", "about": "Pull requests, issues and checks.", "text": "Read and write access to the example/* repositories.\n\n- creating PRs: allowed\n- merging: **never** without the owner\n"},
    {"id": "mcp-calendar", "kind": "mcp", "name": "Calendar", "path": "", "source": "connector", "fires": "", "status": "off", "tools": None, "transport": None, "about": "no description yet", "text": None, "note": "Switched off: no agent needs it yet."},
]}


OUT.mkdir(parents=True, exist_ok=True)
for name, data in [("console.json", console), ("asks.json", asks), ("prs.json", prs), ("agents.json", agents), ("agent-info.json", info),
                   ("work.json", work), ("backlog.json", backlog), ("lab.json", lab), ("services.json", services), ("checks.json", checks),
                   ("schedules.json", schedules), ("wiring.json", wiring)]:
    write(name, data)
(OUT / "journal.jsonl").write_text("".join(json.dumps(e, separators=(",", ":")) + "\n" for e in lines), encoding="utf-8")
print(f"wrote {len(list(OUT.iterdir()))} files to {OUT.relative_to(OUT.parent.parent)} ({len(lines)} journal events)")
