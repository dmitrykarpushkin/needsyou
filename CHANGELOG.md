# Changelog

All notable changes to this project are written down here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- Renamed from agent-console to needsyou: package, page title, PWA manifest, icon. The demo moves to
  https://dmitrykarpushkin.github.io/needsyou/.
- README rewritten for people: what it is, why, a comparison with nearby tools, a three-command quick start. Added a full
  Russian version, README.ru.md.
- Rules for coding agents moved to AGENTS.md; design notes, limitations and development commands moved to docs/.

### Added
- CHANGELOG.md, a provenance section in the README, and a 1280x640 social preview image (`docs/social-preview.png`, made by
  `scripts/social.mjs`).

## [0.1.0] - 2026-10-26

First public release, extracted from a private repository with synthetic demo data.

### Added
- Pages: Now, Projects, Agents, Schedule, Activity, Wiring, Backlog, Lab.
- Data contract for the JSON files a backend writes (`docs/DATA.md`); demo data generator (`scripts/gen_demo.py`) that keeps
  schedules, services and the run journal consistent, with time shifting so the demo always looks current.
- 13 unit tests on ranking, schedule parsing, backlog order, time shift and demo data.
- CI workflow (tests and build) and a GitHub Pages workflow for the demo.

## Before the public release

These milestones come from the private repository's history (dates from `git log` there; that history is not published).

- **2026-10-22**: rewrite around one ranked action list. Home and project pages use the same ranking; work is shown as tasks
  with the roles on them; agents as one list; readable wiring page; stale requests close on their own.
- **2026-10-21**: home screen built from live data. The waiting list hides stale items and adds PRs ready to merge; a read-only
  live state feed; a page for the instructions, skills, hooks and connectors agents run with; a bottom bar on phones.
- **2026-10-20**: unknown owner actions go to the agents list instead of vanishing, with a test.
- **2026-10-19**: the panel's sources moved into the private repository (they had been built elsewhere before that); "Now" home
  screen with live sections that leads with the verdict, phone layout.

[Unreleased]: https://github.com/dmitrykarpushkin/needsyou/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/dmitrykarpushkin/needsyou/releases/tag/v0.1.0
