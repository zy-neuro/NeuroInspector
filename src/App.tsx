import { useEffect, useRef } from 'react'
import './App.css'
import { DropZone } from './components/common/DropZone'
import { IconWave } from './components/common/Icons'
import { MenuDropdown } from './components/common/MenuDropdown'
import { DatasetInfoRow } from './components/dataset/DatasetInfoRow'
import { DatasetVizRow } from './components/dataset/DatasetVizRow'
import { GroupBundleView } from './components/dataset/GroupBundleView'
import { Sidebar } from './components/layout/Sidebar'
import { FullTreePage } from './components/layout/FullTreePage'
import { FileSummaryRow } from './components/overview/FileSummaryRow'
import { FocusedDataView } from './components/overview/FocusedDataView'
import { ProjectBanner } from './components/project/ProjectBanner'
import { ProjectMenu } from './components/project/ProjectMenu'
import { saveTreeHtml, saveTreeJson } from './lib/h5/exportTree'
import { useFileStore } from './store/fileStore'
import {
  bindSystemThemeListener,
  type ThemePreference,
  useThemeStore,
} from './store/themeStore'

function ThemeMenu() {
  const preference = useThemeStore((s) => s.preference)
  const resolved = useThemeStore((s) => s.resolved)
  const setPreference = useThemeStore((s) => s.setPreference)

  const options: { id: ThemePreference; label: string }[] = [
    { id: 'system', label: `System (now ${resolved})` },
    { id: 'dark', label: 'Dark' },
    { id: 'light', label: 'Light' },
  ]

  return (
    <MenuDropdown label="Theme ▾">
      {(close) =>
        options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={preference === opt.id ? 'menu-item-active' : undefined}
            onClick={() => {
              setPreference(opt.id)
              close()
            }}
          >
            {opt.label}
          </button>
        ))
      }
    </MenuDropdown>
  )
}

function SaveTreeButton() {
  const overview = useFileStore((s) => s.overview)
  if (!overview) return null

  return (
    <MenuDropdown label="Save tree ▾">
      {(close) => (
        <>
          <button
            type="button"
            onClick={() => {
              saveTreeJson(overview)
              close()
            }}
          >
            JSON (portable)
          </button>
          <button
            type="button"
            onClick={() => {
              saveTreeHtml(overview)
              close()
            }}
          >
            HTML (open &amp; expand in browser)
          </button>
          <p className="save-menu-note">
            JSON for tools/scripts. HTML for an expandable tree in any browser.
          </p>
        </>
      )}
    </MenuDropdown>
  )
}

function App() {
  const status = useFileStore((s) => s.status)
  const overview = useFileStore((s) => s.overview)
  const openFile = useFileStore((s) => s.openFile)
  const resetToHome = useFileStore((s) => s.resetToHome)
  const mode = useFileStore((s) => s.mode)
  const selectedPath = useFileStore((s) => s.selectedPath)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => bindSystemThemeListener(), [])

  const ready = status === 'ready' && overview

  return (
    <div className="app-shell">
      <header className="topbar">
        <button type="button" className="brand-block brand-home" onClick={() => resetToHome()}>
          <div className="brand-mark" aria-hidden="true">
            <IconWave size={22} />
          </div>
          <div className="brand">
            <h1>NeuroInspector</h1>
          </div>
        </button>
        <div className="topbar-actions">
          <ThemeMenu />
          <ProjectMenu />
          {ready ? <SaveTreeButton /> : null}
          {ready ? (
            <button type="button" className="btn primary" onClick={() => inputRef.current?.click()}>
              Open file
            </button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept=".h5,.hdf5,.nwb,application/x-hdf"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void openFile(f)
              e.target.value = ''
            }}
          />
        </div>
      </header>

      {!ready ? (
        <>
          <ProjectBanner />
          <DropZone />
        </>
      ) : (
        <div className="workspace">
          <Sidebar />
          <main className="main">
            <ProjectBanner />
            {mode === 'overview' ? (
              <>
                <FileSummaryRow />
                <DatasetInfoRow />
                <FocusedDataView />
              </>
            ) : mode === 'tree' ? (
              <FullTreePage />
            ) : mode === 'bundle' ? (
              <GroupBundleView />
            ) : (
              <>
                <DatasetInfoRow />
                <DatasetVizRow />
              </>
            )}
          </main>
        </div>
      )}

      <footer className="status-bar">
        <span title={selectedPath ?? undefined}>
          {status === 'loading'
            ? 'Loading…'
            : ready
              ? mode === 'overview'
                ? selectedPath
                  ? `Overview · ${selectedPath}`
                  : 'Ready · Overview'
                : mode === 'tree'
                  ? selectedPath
                    ? `File tree · ${selectedPath}`
                    : 'File tree view'
                  : mode === 'bundle'
                    ? `Group view · ${selectedPath}`
                    : `Dataset · ${selectedPath}`
              : 'Waiting for a local file'}
        </span>
        <span title="Inspection aid only — not responsible for file contents or scientific conclusions">
          Local preview only · not responsible for data contents · sampling ≤250k
        </span>
      </footer>
    </div>
  )
}

export default App
