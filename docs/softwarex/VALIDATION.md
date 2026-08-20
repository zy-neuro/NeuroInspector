# Software validation, performance, and reproducibility (SoftwareX Part A)

This folder supports the NeuroInspector SoftwareX manuscript. It is **not** required to use the app day-to-day.

## Automated tests (CI)

```bash
npm test
npm run build
```

GitHub Actions workflow: `.github/workflows/ci.yml` (test + build on `main` / PRs).

Covered automatically:

| Check | Location |
|-------|----------|
| Project pack schema accept / reject | `src/lib/project/projectPack.test.ts` |
| Export → JSON → import round-trip | same |
| SHA-256 stable identity + byte sensitivity | same |
| Fingerprint match / mismatch (`sha256` + `sizeBytes`) | same |
| Malformed project JSON fails loudly | same |
| Path / preview format helpers | `src/lib/h5/format.test.ts` |

## Browsers (this machine)

| Browser | Version | Notes |
|---------|---------|-------|
| Google Chrome | **151.0.7922.138** | Primary for Table 1 |
| Safari | **26.5.2** (macOS 26.5.2) | Smoke-tested / available |
| Firefox | — | Not installed here |

**Machine:** Mac mini, Apple M4 Pro, 48 GB RAM, macOS 26.5.2.

## Performance numbers for manuscript Table 1

**Method (be explicit in the paper):** timings below are from an **h5wasm Node harness** (`scripts/bench_open.mjs` / equivalent): open file by path → full hierarchy walk → bounded dataset value/slice read.  
They approximate the WASM parse + tree cost used in the browser. They are **not** wall-clock “click Open → Overview paints” in Chrome (that also includes the browser `File.arrayBuffer()` copy into the WASM FS, which dominates for multi-GB files).

If you need literal UI stopwatch times for the 16.8 MiB example only, re-measure once in Chrome; small files should be in the same ballpark (sub-second interactive).

### Suggested Table 1 fill-in

| File | Size | Groups / datasets | Open+tree | Preview | Browser |
|------|------|-------------------|-----------|---------|---------|
| NWB example (this paper) `sub-710327122_ses-711201882_icephys.nwb` | **16.8 MiB** (17.6 MB) | **348 / 680**† | **~21 ms** | **~0.4 ms**‡ | Chrome 151 |
| Medium HDF5 (local DKI volume) | **~1.07 GiB** (1.12 GB) | **51 / 262** | **~66 ms** | **~47 ms** | Chrome 151§ |
| Large HDF5 (local DKI grid) | **~6.05 GiB** (6.50 GB) | **209 / 1055** | **~156 ms** | **~54 ms** | Chrome 151§ |

† Paper text says 349 groups; harness count of nested groups is 348 — Overview likely includes the root group (**349 = 348 + root**). Datasets **680** match.  
‡ Preview on `/acquisition/data_00043_AD0/data` (**1,701,000** elements); bounded slice/read path.  
§ Browser column = intended reporting browser; numeric times are harness (above). Do **not** claim multi-GB UI open without a real Chrome stopwatch — current app loads the whole file into memory via `arrayBuffer()`.

**SHA-256 (paper file):** `8162b5bcfbc457e8fbf4f4e87c19408019fe5ef456d908f0ad3c2532b49c8a05` (matches manuscript prefix `8162b5bc…`).

**Extra local NWB (not in Table 1):** `sub-758112406_ses-760315976_icephys.nwb` — 73.3 MB, 658 / 1274, open+walk ~37 ms.

Privacy: medium/large rows are **private local HDF5** (not DANDI). In the paper, name them generically (“local volumetric HDF5, ~1 GiB / ~6 GiB”) unless you intend to release them.

## Malformed / unsupported input

| Input | Observed behavior |
|-------|-------------------|
| Non-HDF5 bytes opened via h5wasm | HDF5 reports **“file signature not found” / unable to open**; UI stores `error` from the thrown message and shows it in the landing **error-box** (no silent empty tree). |
| Project JSON wrong format | `Not a NeuroInspector project file (expected neuroinspector-project/v1).` |
| File picker | `accept=".h5,.hdf5,.nwb,application/x-hdf"` (OS may still allow “all files”; bad content still hits the error path above). |

## Example project pack + Python reader

- Example pack: [`examples/example.neuroinspector.json`](../examples/example.neuroinspector.json)
- Reader:

```bash
python3 scripts/read_project_pack.py examples/example.neuroinspector.json
```

For the camera-ready pack matching Section 3, export from the UI against `sub-710327122_ses-711201882_icephys.nwb` (fingerprint above).

## Manual UI checks still on you (2 minutes)

1. Chrome: open the 16.8 MiB NWB → Overview shows ~349 groups / 680 datasets.  
2. Safari smoke: same file opens.  
3. Export pack → import → reconnect same file → **matched**; other file → **mismatch**.  
4. Optional: stopwatch Open→Overview and click→preview for the paper file if you want UI wall times in Table 1 instead of harness ms.

## Draft manuscript text (paste / replace TODOs)

### Software validation and performance

NeuroInspector v0.1.0 was validated at two layers. First, automated unit tests exercise the project-pack schema (`neuroinspector-project/v1`), JSON export/import round-trips, SHA-256 source fingerprinting, match/mismatch reconnect logic, and rejection of malformed project files; these tests run in continuous integration (GitHub Actions) on pushes and pull requests to `main`. Second, files spanning ~17 MB to ~6 GiB were opened with the same WebAssembly HDF5 stack used in the browser: the Section 3 NWB example (16.8 MiB; 348 groups / 680 datasets, root included → 349 in the Overview), a ~1 GiB HDF5 volume (51 / 262), and a ~6 GiB HDF5 volume (209 / 1055). Full hierarchies were traversed; bounded previews were generated for large arrays without requiring a complete rendered series of every element. Reconnecting an exported project pack restores selections when the source fingerprint matches and reports a mismatch otherwise. Non-HDF5 input fails with an explicit open error (HDF5 “file signature not found”), surfaced in the UI rather than a silent empty tree. Smoke testing used Google Chrome 151 and Safari 26.5 on macOS (Apple M4 Pro, 48 GB RAM).

Table 1 reports approximate open + full hierarchy walk time and a bounded dataset preview read using h5wasm (Node harness on the same machine). These times characterize parse and traversal cost; interactive browser open of multi-gigabyte files additionally depends on copying file bytes into the page memory budget.

NeuroInspector is an inspection and documentation tool, not an NWB validator, analysis environment, or replacement for PyNWB.

## Version alignment checklist (before submit)

- [ ] `package.json` version matches manuscript metadata (currently `0.1.0`)
- [ ] GitHub Release / tag `v0.1.0` points at the commit that includes these tests
- [ ] Zenodo DOI archive matches that tag
- [ ] Live site https://zy-neuro.github.io/NeuroInspector/ built from the same release
- [ ] Figures / screenshots taken from that build
- [ ] Example pack + this document included in the tagged tree
