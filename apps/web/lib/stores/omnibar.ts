import { create } from 'zustand'

interface OmniBarStore {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export const useOmniBar = create<OmniBarStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}))
