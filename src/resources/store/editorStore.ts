import { create } from "zustand";

// The default sample VizRep shown when nothing is selected. Copied verbatim from
// the old global_definitions.ts (codeEditorValue seed) so the editor opens with
// the same placeholder the original client used.
export const DEFAULT_VIZREP_CODE =
  "// This is an example only. Choose an object on the left side.\n/** @param {GraphicContext} gc */\nasync function vizRep(gc) {\n  let icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAADMElEQVR4nOzVwQnAIBQFQYXff81RUkQCOyDj1YOPnbXWPmeTRef+/3O/OyBjzh3CD95BfqICMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMO0TAAD//2Anhf4QtqobAAAAAElFTkSuQmCC';\n  await gc.graphic_cube(1, 1, 1, 'grey');\n}";

// One open scene-instance tab. Engine state (Three.js scenes) lives on
// engine/global-definition.ts (P2); this is just the UI metadata the tab bar
// needs to render and identify a tab. selectedTab indexes into `tabs`.
export interface TabMeta {
  uuid: string;
  name: string;
}

interface EditorState {
  /** Current Monaco buffer (the geometry being edited). */
  codeEditorValue: string;
  /** 2D (false) vs 3D (true) preview mode. Old default: true. */
  threeDimensional: boolean;
  /** Index of the active scene-instance tab. Old default: 0. */
  selectedTab: number;
  /** Open scene-instance tabs (UI metadata mirror of engine tabContext). */
  tabs: TabMeta[];
  /**
   * Gate for the live-preview loop (vizrep-update-checker). The engine reads/
   * mutates this lock during a preview run; UI state mirrors it here so the
   * old `globalObjectInstance.readyForVizRepUpdate` flag has a home.
   */
  readyForVizRepUpdate: boolean;

  setCode: (code: string) => void;
  setThreeDimensional: (threeDimensional: boolean) => void;
  setSelectedTab: (index: number) => void;
  setTabs: (tabs: TabMeta[]) => void;
  setReadyForVizRepUpdate: (ready: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  codeEditorValue: DEFAULT_VIZREP_CODE,
  threeDimensional: true,
  selectedTab: 0,
  tabs: [],
  readyForVizRepUpdate: true,

  setCode: (code) => set({ codeEditorValue: code }),
  setThreeDimensional: (threeDimensional) => set({ threeDimensional }),
  setSelectedTab: (index) => set({ selectedTab: index }),
  setTabs: (tabs) => set({ tabs }),
  setReadyForVizRepUpdate: (ready) => set({ readyForVizRepUpdate: ready }),
}));
