// `react` inside a plugin bundle is this file: the Vite preset aliases it.
// The real React is the SDK's (sdk.react), which exists only once activate()
// runs, so activate must call setReact(sdk.react) before anything renders.
//
// Rule: never call a React API at module top level (no createContext, memo,
// forwardRef or lazy at import time). Create those inside activate() or
// inside components. Hooks and createElement are fine: they only run while
// rendering.

let current;

/** Stores the SDK's React. Call it first thing in activate(). */
export function setReact(r) {
  current = r;
}

function react() {
  if (!current) throw new Error('React is not ready: call setReact(sdk.react) in activate() before rendering.');
  return current;
}

// A function that looks up the SDK's React export when called, not when imported.
function fwd(name) {
  return (...args) => react()[name](...args);
}

export const Fragment = Symbol.for('react.fragment');
export const StrictMode = Symbol.for('react.strict_mode');
export const Suspense = Symbol.for('react.suspense');
export const createElement = fwd('createElement');
export const cloneElement = fwd('cloneElement');
export const isValidElement = fwd('isValidElement');
export const createContext = fwd('createContext');
export const createRef = fwd('createRef');
export const forwardRef = fwd('forwardRef');
export const memo = fwd('memo');
export const lazy = fwd('lazy');
export const startTransition = fwd('startTransition');
export const useState = fwd('useState');
export const useReducer = fwd('useReducer');
export const useEffect = fwd('useEffect');
export const useLayoutEffect = fwd('useLayoutEffect');
export const useInsertionEffect = fwd('useInsertionEffect');
export const useRef = fwd('useRef');
export const useMemo = fwd('useMemo');
export const useCallback = fwd('useCallback');
export const useContext = fwd('useContext');
export const useId = fwd('useId');
export const useImperativeHandle = fwd('useImperativeHandle');
export const useSyncExternalStore = fwd('useSyncExternalStore');
export const useTransition = fwd('useTransition');
export const useDeferredValue = fwd('useDeferredValue');
export const useDebugValue = fwd('useDebugValue');

const proxy = new Proxy({}, { get: (_t, key) => react()[key] });
export default proxy;
