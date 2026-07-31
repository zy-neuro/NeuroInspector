import { create } from 'zustand'

export type ThemePreference = 'system' | 'dark' | 'light'

const STORAGE_KEY = 'neuroinspector-theme'

function readStored(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'system' || v === 'dark' || v === 'light') return v
  } catch {
    /* ignore */
  }
  return 'system'
}

function resolveTheme(pref: ThemePreference): 'dark' | 'light' {
  if (pref === 'dark' || pref === 'light') return pref
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyDom(pref: ThemePreference) {
  const resolved = resolveTheme(pref)
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
}

interface ThemeState {
  preference: ThemePreference
  resolved: 'dark' | 'light'
  setPreference: (pref: ThemePreference) => void
  cyclePreference: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const preference = typeof window !== 'undefined' ? readStored() : 'system'
  if (typeof window !== 'undefined') applyDom(preference)

  return {
    preference,
    resolved: typeof window !== 'undefined' ? resolveTheme(preference) : 'dark',
    setPreference: (pref) => {
      try {
        localStorage.setItem(STORAGE_KEY, pref)
      } catch {
        /* ignore */
      }
      applyDom(pref)
      set({ preference: pref, resolved: resolveTheme(pref) })
    },
    cyclePreference: () => {
      const order: ThemePreference[] = ['system', 'dark', 'light']
      const i = order.indexOf(get().preference)
      get().setPreference(order[(i + 1) % order.length])
    },
  }
})

/** Call once at startup to follow OS changes while preference is system. */
export function bindSystemThemeListener() {
  const mq = window.matchMedia('(prefers-color-scheme: light)')
  const onChange = () => {
    const pref = useThemeStore.getState().preference
    if (pref === 'system') {
      applyDom('system')
      useThemeStore.setState({ resolved: resolveTheme('system') })
    }
  }
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
