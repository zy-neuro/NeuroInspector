# NeuroInspector — release checklist

## A. Materials already prepared (local)

- [x] App source (`src/`, `index.html`, Vite/TS configs)
- [x] `package.json` / `package-lock.json` (`license: Apache-2.0`)
- [x] `environment.yml` (conda: Python 3.12 + Node 22)
- [x] Detailed `README.md`
- [x] `LICENSE` + `NOTICE` (Apache-2.0)
- [x] `.gitignore` (includes `.cursor/`, data binaries, `node_modules`, …)
- [x] GitHub Pages workflow + Vite `base` `/NeuroInspector/`
- [x] `samples/README.md`
- [ ] Screenshots under `docs/screenshots/` (`landing.png` / `overview.png` / `file-tree.png`)

## B. Decisions

- [x] GitHub repo name: **`NeuroInspector`**
- [x] Do **not** commit `.cursor/`
- [ ] `NOTICE` copyright line (contributors vs your name)
- [ ] Screenshots added (folder + README ready; drop three PNGs in)
- [x] Local `npm run build` succeeds (checked)

## C. Must NOT commit

- [ ] No `.cursor/`
- [ ] No `node_modules/` / `dist/`
- [ ] No `*.h5` / `*.nwb` / secrets / `.env`

## D. First upload (when you say go)

- [ ] First git commit
- [ ] Create **public** GitHub repo **`NeuroInspector`**
- [ ] `git push -u origin main`
- [ ] **Settings → Pages → Source: GitHub Actions**
- [ ] Open `https://<user>.github.io/NeuroInspector/`
- [ ] Paste real Live URL into README (optional follow-up commit)
