# Development

Tested with Node 22.22. The tests load `.ts` files through Node's built-in type stripping, which is on by default from Node 22.18.

```sh
npm install
npm run dev                   # http://localhost:5173, demo data
npm test                      # ranking, schedule parsing, backlog order, demo time shift, demo data consistency
npm run typecheck             # tsc, no emit
npm run build                 # typecheck + production build into dist/
npm run preview               # serve dist/
python3 scripts/gen_demo.py   # regenerate public/demo/ (deterministic)
```

## Pointing it at a real backend

Build with `VITE_DATA_SOURCE=http` and `VITE_DATA_URL=<where your JSON files are>` (see `.env.example`), then serve `dist/` from
anywhere. The Vite `base` is relative (`./`), so the page works under any sub-path, including the GitHub Pages path `/needsyou/`.
What each file must contain: [DATA.md](DATA.md).

## Screenshots

- `scripts/screenshots.mjs` captures `docs/screenshots/` from `npm run preview` (port 4173).

It needs Playwright with Chromium, which is not a dependency of the project.

## Continuous integration

- `.github/workflows/ci.yml`: `npm ci`, `npm test`, `npm run build` on every push to `main` and every pull request.
- `.github/workflows/pages.yml`: builds the demo and deploys `dist/` to GitHub Pages at
  https://dmitrykarpushkin.github.io/needsyou/. Turn it on once under Settings, Pages, Source: GitHub Actions.
