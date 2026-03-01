import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WindowType =
  | "SPRITE_EDITOR"
  | "OBJECT_EDITOR"
  | "ROOM_EDITOR"
  | "SCRIPT_EDITOR"
  | "FUNCTION_EDITOR";

export interface WindowNode {
  id: string;
  type: WindowType;
  title: string;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  data?: any;
}

export interface WindowInterceptors {
  onClose?: () => boolean | Promise<boolean>;
  onMinimize?: () => boolean | Promise<boolean>;
  onMaximize?: () => boolean | Promise<boolean>;
}

interface WindowState {
  windows: WindowNode[];
  activeWindowId: string | null;
  interceptors: Record<string, WindowInterceptors>;

  openWindow: (
    payload: Omit<
      WindowNode,
      "isMinimized" | "isMaximized" | "position" | "size" | "zIndex"
    >,
  ) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindowPosition: (
    id: string,
    position: { x: number; y: number },
  ) => void;
  updateWindowSize: (
    id: string,
    size: { width: number; height: number },
  ) => void;
  toggleMaximizeWindow: (id: string) => void;

  registerInterceptors: (id: string, interceptors: WindowInterceptors) => void;
  unregisterInterceptors: (id: string) => void;

  requestClose: (id: string) => Promise<void>;
  requestMinimize: (id: string) => Promise<void>;
  requestMaximize: (id: string) => Promise<void>;
}

export const useWindowStore = create<WindowState>()(
  persist(
    (set, get) => ({
      windows: [],
      activeWindowId: null,
      interceptors: {},

      registerInterceptors: (id, fns) =>
        set((state) => ({
          interceptors: { ...state.interceptors, [id]: fns },
        })),
      unregisterInterceptors: (id) =>
        set((state) => {
          const newInterceptors = { ...state.interceptors };
          delete newInterceptors[id];
          return { interceptors: newInterceptors };
        }),

      requestClose: async (id) => {
        const interceptor = get().interceptors[id]?.onClose;
        if (interceptor && !(await interceptor())) return;
        get().closeWindow(id);
      },
      requestMinimize: async (id) => {
        const interceptor = get().interceptors[id]?.onMinimize;
        if (interceptor && !(await interceptor())) return;
        get().minimizeWindow(id);
      },
      requestMaximize: async (id) => {
        const interceptor = get().interceptors[id]?.onMaximize;
        if (interceptor && !(await interceptor())) return;
        get().toggleMaximizeWindow(id);
      },

      openWindow: (payload) =>
        set((state) => {
          const existingWindow = state.windows.find((w) => w.id === payload.id);
          const maxZIndex = state.windows.reduce(
            (max, w) => Math.max(max, w.zIndex),
            0,
          );

          if (existingWindow) {
            return {
              windows: state.windows.map((w) =>
                w.id === payload.id
                  ? { ...w, isMinimized: false, zIndex: maxZIndex + 1 }
                  : w,
              ),
              activeWindowId: payload.id,
            };
          }

          const newWindow: WindowNode = {
            ...payload,
            isMinimized: false,
            isMaximized: false,
            position: {
              x: window.innerWidth / 2 - 300,
              y: window.innerHeight / 2 - 200,
            },
            size: { width: 600, height: 400 },
            zIndex: maxZIndex + 1,
          };

          return {
            windows: [...state.windows, newWindow],
            activeWindowId: payload.id,
          };
        }),

      closeWindow: (id) =>
        set((state) => ({
          windows: state.windows.filter((w) => w.id !== id),
          activeWindowId:
            state.activeWindowId === id ? null : state.activeWindowId,
        })),

      minimizeWindow: (id) =>
        set((state) => ({
          windows: state.windows.map((w) =>
            w.id === id ? { ...w, isMinimized: true } : w,
          ),
          activeWindowId:
            state.activeWindowId === id ? null : state.activeWindowId,
        })),

      restoreWindow: (id) =>
        set((state) => {
          const maxZIndex = state.windows.reduce(
            (max, w) => Math.max(max, w.zIndex),
            0,
          );
          return {
            windows: state.windows.map((w) =>
              w.id === id
                ? { ...w, isMinimized: false, zIndex: maxZIndex + 1 }
                : w,
            ),
            activeWindowId: id,
          };
        }),

      focusWindow: (id) =>
        set((state) => {
          if (state.activeWindowId === id) return state;
          const maxZIndex = state.windows.reduce(
            (max, w) => Math.max(max, w.zIndex),
            0,
          );
          return {
            windows: state.windows.map((w) =>
              w.id === id ? { ...w, zIndex: maxZIndex + 1 } : w,
            ),
            activeWindowId: id,
          };
        }),

      updateWindowPosition: (id, position) =>
        set((state) => ({
          windows: state.windows.map((w) =>
            w.id === id ? { ...w, position } : w,
          ),
        })),

      updateWindowSize: (id, size) =>
        set((state) => ({
          windows: state.windows.map((w) => (w.id === id ? { ...w, size } : w)),
        })),

      toggleMaximizeWindow: (id) =>
        set((state) => {
          const maxZIndex = state.windows.reduce(
            (max, w) => Math.max(max, w.zIndex),
            0,
          );
          return {
            windows: state.windows.map((w) =>
              w.id === id
                ? { ...w, isMaximized: !w.isMaximized, zIndex: maxZIndex + 1 }
                : w,
            ),
            activeWindowId: id,
          };
        }),
    }),
    {
      name: "game-kineme-workspace",
      partialize: (state) => ({
        windows: state.windows,
        activeWindowId: state.activeWindowId,
      }),
    },
  ),
);
