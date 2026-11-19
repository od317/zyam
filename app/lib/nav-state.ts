// Becomes true once the first page has hydrated, so later renders know they came from a click, not a fresh load.
export const nav = { ready: false };

type Listener = () => void;
const listeners = new Set<Listener>();

// Shared state between the 3D stage (behind the pages) and the project cards.
export const stage = {
  enter: null as null | (() => Promise<boolean>), // set by HallStage once the 3D scene is ready
  busy: false, // true while the doors are opening
  leaving: false, // true from the click until the project page has arrived: the cards fade out
  setLeaving(v: boolean) {
    if (stage.leaving === v) return;
    stage.leaving = v;
    listeners.forEach((l) => l());
  },
};

export const subscribeStage = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
