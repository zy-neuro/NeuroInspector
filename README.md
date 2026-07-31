# NeuroInspector

**NeuroInspector** is a local-in-browser tool for **visually inspecting** HDF5 and NWB files used in neuroscience (and any plain HDF5 that shares the same container format).

You open a file from your own disk. The app reads it in the browser with [h5wasm](https://github.com/usnistgov/h5wasm), shows the hierarchy, attributes, and **sampled** previews of arrays. **Nothing is uploaded** to a remote server—the optional GitHub Pages site only hosts the static web app.

| | |
|---|---|
| **Status** | v0.1 — inspection + project annotation packs |
| **Formats** | `.h5`, `.hdf5`, `.nwb` |
| **Runtime** | Modern desktop browser (Chrome / Edge / Firefox / Safari) |
| **License** | [Apache-2.0](./LICENSE) |
| **Live site** | After publish: `https://<user>.github.io/NeuroInspector/` |

---

## Table of contents

1. [What this product is](#what-this-product-is)
2. [What this product is not](#what-this-product-is-not)
3. [Disclaimer](#disclaimer)
4. [Privacy](#privacy)
5. [Features at a glance](#features-at-a-glance)
6. [Requirements](#requirements)
7. [Installation](#installation)
8. [Quick start](#quick-start)
9. [User guide](#user-guide)
10. [Visualization & sampling rules](#visualization--sampling-rules)
11. [Project packs](#project-packs)
12. [Exporting the file tree](#exporting-the-file-tree)
13. [Technology](#technology)
14. [Repository layout](#repository-layout)
15. [Development scripts](#development-scripts)
16. [GitHub Pages](#github-pages)
17. [Troubleshooting](#troubleshooting)
18. [Roadmap](#roadmap)
19. [Contributing](#contributing)
20. [License](#license)
21. [Citation & acknowledgements](#citation--acknowledgements)

---

## What this product is

NeuroInspector helps you **answer questions like**:

- What groups and datasets are inside this NWB / HDF5 file?
- What are the shapes, dtypes, sizes, and attributes?
- Does this large array look roughly constant, noisy, or structured (from a **sampled** preview)?
- Which paths should I keep for a smaller analysis subset later—and can I leave notes for myself or a collaborator?

It is aimed at **neuroscientists, students, and engineers** who work with NWB or HDF5 and want a fast visual check **without installing a heavy desktop stack** or sending data to a cloud service.

Typical workflow:

1. Open a local file.
2. Skim **Overview** (summary + focused preview).
3. Drill into datasets from **Quick tree**, or inspect structure/fields in **File tree**.
4. Optionally mark a **project subset**, write notes, and export a `.neuroinspector.json` pack that can be re-linked to the original file later.

---

## What this product is not

NeuroInspector is **not**:

- A replacement for **PyNWB / HDMF / MATLAB / analysis pipelines**
- A validator or “cleanliness” checker for NWB compliance
- An editor that **writes or rewrites** HDF5 / NWB bytes (no in-place edit, no subset `.h5` export yet)
- A multi-user cloud platform or database of shared files
- A guarantee that a preview matches the full array (previews are sampled)

If you need formal analysis, statistics, or publication-quality figures from the full data, use your usual scientific stack on the original file.

---

## Disclaimer

NeuroInspector is an **inspection / visualization aid** only. It does not validate, clean, analyze, or certify scientific data. Previews may be sampled, reshaped for display, or otherwise simplified and can be incomplete or misleading. **You** are responsible for interpreting your own files and for any scientific or clinical decisions. The authors accept no liability for decisions made using this tool.

The hosted web page (if you use GitHub Pages) serves only static assets. File contents stay on the user’s machine.

---

## Privacy

- Files are selected via the browser file picker or drag-and-drop.
- Parsing and sampling run **locally** in the page (WebAssembly).
- Project packs and tree exports are downloaded to your machine when you choose Export / Save.
- The app does not implement an upload API. A static host never receives your HDF5/NWB payloads through this design.

Browser extensions or your network environment are outside the app’s control; use a normal, updated browser.

---

## Features at a glance

| Area | What you get |
|------|----------------|
| **Landing** | Brand, open / drop file, short disclaimer |
| **Overview** | File cards, focused entry summary, focus chips, light charts |
| **Dataset view** | Larger sample budget; series, small tables, or heatmaps |
| **File tree** | Faithful hierarchy; fields/attributes; subset checkboxes; notes; quiet link to Dataset view |
| **Quick tree** | Fast navigation; context menu to show datasets under a folder together |
| **Project packs** | Selected paths + notes + source fingerprint (JSON) |
| **Save tree** | Hierarchy as portable JSON or expandable HTML |
| **Theme** | System / dark / light |

---

## Requirements

- A **dedicated** Conda environment from `environment.yml` (Python 3.12 + Node.js 22), **or** Node.js **22+** installed another way  
  - **Do not install project tools into conda `base`.**
- A modern desktop browser with WebAssembly support
- Enough RAM for the file you open (very large files may be slow or fail in-browser)

---

## Installation

### Option A — Conda (recommended for this repo)

```bash
git clone <your-fork-or-repo-url>
cd NeuroInspector   # or your local folder name

conda env create -f environment.yml    # first time only
conda activate neurodata-inspector

npm install
```

### Option B — Node only

If you already have Node 22+:

```bash
cd NeuroInspector   # or your local folder name
npm install
```

### Sample data

Put local test files under `samples/`. Extensions `.h5`, `.hdf5`, and `.nwb` are **gitignored**. Do not commit real experimental data.

---

## Quick start

```bash
conda activate neurodata-inspector   # if using conda
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) (or the URL Vite prints).

1. Click **Open file** or drop a `.h5` / `.nwb`.
2. Wait for the overview to load (large files need a few seconds; fingerprinting for projects hashes the file once).
3. Explore as described below.

---

## User guide

### Top bar

| Control | Action |
|---------|--------|
| **NeuroInspector** (brand) | Return to the landing page and close the current file |
| **Theme ▾** | System / Dark / Light |
| **Project ▾** | Export / import project JSON; connect original file |
| **Save tree ▾** | Export tree as JSON or HTML (when a file is open) |
| **Open file** | Replace the current file with another local file |

### Sidebar

- **Overview** — summary + focused previews (default after open).
- **File tree** — full hierarchy on the main panel; sidebar explains that selection stays on the tree page.
- **Quick tree** — shown when not on File tree. Click datasets to open Dataset view. **Right-click a folder** → *Show all datasets together* (bundled view, capped for performance).

Footer of the sidebar: group count, dataset count, format label.

### Overview mode

1. **File overview** — size, dataset/group counts, root attribute count, largest dataset (hover for full path tip when useful).
2. **Focused entry** — metadata for the current focus (shape, dtype, stats, attributes). Resize by dragging the bottom edge. Long values show a tip only when truncated (or when the stored preview was shortened, e.g. long notes).
3. **Focused data view** — chips to switch among focus candidates; lightweight charts; **Open dataset view** for the full sample budget.

Largest dataset on the file card is **informational** (not a navigation button).

### Dataset view

Opened from Quick tree, Focused data view, or File tree **Data view →**.

- Uses the **full** sample budget (see [sampling](#visualization--sampling-rules)).
- Layout depends on dtype/shape (series + histogram, small matrix table, or heatmap + helpers).

### File tree mode

Designed for **structure + fields + project selection**, not embedded charts.

- **Left:** hierarchy with checkboxes for the project subset; Expand all / Collapse all.
- **Right:** entry fields (kind, shape, dtype, attributes) and an optional **note**.
- **Data view →** (quiet control) jumps to Dataset view for the selected dataset.
- **Bottom — Project summary:** every checked path and every path with a note; uncheck, jump back into the tree, or clear notes.

### Group bundle view

From Quick tree context menu: stacks previews for datasets under a group (up to **24** datasets; UI indicates if truncated).

---

## Visualization & sampling rules

Exact limits live in `src/lib/h5/types.ts` and related preview helpers. Approximate behavior in v0.1:

| Context | Element budget (order of magnitude) |
|---------|--------------------------------------|
| Overview / bundle previews | ≤ **32 000** |
| Dataset view | ≤ **250 000** |
| Heatmap max side | Overview ~128; Dataset view ~256 |
| Small 2D as table | ≤ 24×24 and ≤ 256 cells |

**Preview kinds (simplified):**

- **1D numeric** → series + distribution  
- **Small 2D** → table  
- **Larger 2D** → heatmap in Dataset view; overview may show row-means / series instead  
- **Non-numeric / empty** → text preview or an explicit empty state  

UI copy notes when data are sampled. Always treat charts as **inspection aids**, not ground truth for the full array.

---

## Project packs

### Why

Keep a lightweight record of “what I cared about” without copying or mutating the multi‑GB original file.

### What is stored (`.neuroinspector.json`)

Format id: `neuroinspector-project/v1`.

- Source file identity: name, size, **SHA-256**
- Selected paths (intended subset)
- Annotations (notes, optional tags, timestamps)
- Optional title / description

The **HDF5/NWB file is never modified**.

### How to use

1. In **File tree**, check paths and/or write notes on entries.  
2. **Project → Export project JSON**.  
3. Later: **Project → Import project JSON**.  
4. **Project → Connect original file…** (or Open file) so the app can match the fingerprint and show linked / mismatch status.

### Not yet included

Exporting a real **subset `.h5` / `.nwb`** binary. That is planned as a later step (and may become a separate tool if write semantics grow complex).

---

## Exporting the file tree

**Save tree ▾** (with a file open):

| Format | Use |
|--------|-----|
| **JSON** | Portable snapshot for scripts / archives (`.neurotree.json`) |
| **HTML** | Open in any browser and expand/collapse the tree |

These exports describe structure/metadata available to the inspector; they are not a substitute for the binary file.

---

## Technology

| Piece | Choice |
|-------|--------|
| UI | React 19 + TypeScript + Vite 8 |
| State | Zustand |
| Charts | Recharts + canvas heatmap |
| HDF5 in browser | h5wasm |
| Env (optional) | Conda: Python 3.12 + Node 22 (`environment.yml`) |

---

## Repository layout

```
neurodata-inspector/
├── .github/workflows/pages.yml   # GitHub Pages deploy
├── samples/                      # Local binaries only (gitignored *.h5/*.nwb)
├── src/
│   ├── components/
│   │   ├── common/               # Landing, icons, menus, hover tips
│   │   ├── layout/               # Sidebar, File tree, tree nodes
│   │   ├── overview/             # File overview, focused data view
│   │   ├── dataset/              # Dataset panels + viz/
│   │   └── project/              # Project menu, banner, summary
│   ├── lib/
│   │   ├── h5/                   # Open, walk, read, stats, preview kind
│   │   └── project/              # Project schema, hash, export/import
│   ├── store/                    # File, theme, project state
│   ├── App.tsx
│   └── index.css / App.css
├── environment.yml
├── LICENSE
├── package.json
├── vite.config.ts
└── README.md
```

---

## Development scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (default port **5173**) |
| `npm run build` | `tsc -b` + production build → `dist/` |
| `npm run preview` | Preview the production build locally |

Pages production builds set `GITHUB_PAGES=true` so Vite `base` is `/NeuroInspector/`. Local dev uses `/`.

---

## Screenshots

Place PNGs in `docs/screenshots/` (see filenames below). They are included in the repo when present:

| Screen | File |
|--------|------|
| Landing | `docs/screenshots/landing.png` |
| Overview | `docs/screenshots/overview.png` |
| File tree | `docs/screenshots/file-tree.png` |

![Landing](docs/screenshots/landing.png)

![Overview](docs/screenshots/overview.png)

![File tree](docs/screenshots/file-tree.png)

---

## GitHub Pages

Automated deploy is configured in `.github/workflows/pages.yml`.

1. Create a GitHub repository named **`NeuroInspector`** (name must match the Vite `base` path).
2. Push `main`.
3. **Settings → Pages → Build and deployment → Source:** GitHub Actions.
4. Open `https://<github-username>.github.io/NeuroInspector/` after the workflow succeeds.

No custom domain is required. You can add one later in Pages settings if you want.

---

## Troubleshooting

| Symptom | Things to try |
|---------|----------------|
| Page won’t load assets on Pages | Confirm repo name matches Vite `base` (`/NeuroInspector/`) |
| File won’t open / WASM error | Try another browser; confirm the file is valid HDF5/NWB; try a smaller file |
| UI freezes on huge groups | Bundle view is capped (24 datasets); open datasets individually |
| Project shows **mismatch** | Re-connect the exact original file (same bytes → same SHA-256) |
| Long attribute tip empty / short | Re-open the file after upgrading (attrs carry a longer tip field) |
| Hover tip missing on truncated text | Hard-refresh; tips show when CSS-clipped or when preview text ends with `…` |
| Conda / npm confusion | Always `conda activate neurodata-inspector` before `npm` for this project |

---

## Roadmap

Ideas under consideration (not commitments):

- Export a real **subset HDF5/NWB** alongside the project pack  
- Performance pass for very large files  
- Optional separate **writer / document-style** tool (out of scope for this inspector)

---

## Contributing

Issues and pull requests are welcome once the repository is public.

- Keep the product focused on **local inspection** (no silent uploads).  
- Prefer small, reviewable PRs.  
- Do not commit binary sample data or secrets.  
- Match existing TypeScript / UI patterns.

---

## License

Distributed under the **Apache License, Version 2.0** — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).

You may use, modify, and distribute the software under that license. It is provided **AS IS**, without
warranties. A short patent grant is included in Apache-2.0 (see the license text for details).

Unless required by applicable law or agreed to in writing, software distributed under the License is
distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
implied. See the License for the specific language governing permissions and limitations under the
License.

---

## Citation & acknowledgements

If NeuroInspector is useful in your work, a short acknowledgement is appreciated. There is no formal paper citation for v0.1 yet.

This project is **not** affiliated with the [Neurodata Without Borders](https://www.nwb.org/) project, the Allen Institute, or HDF Group. It only reads files that use those formats.

Built with React, Vite, Recharts, Zustand, and h5wasm.
