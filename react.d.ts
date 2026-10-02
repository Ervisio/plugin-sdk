/**
 * The React shim. In a plugin built with the preset, `import ... from 'react'` resolves here; the types are React's own.
 * Call setReact(sdk.react) first thing in activate().
 */
import type * as ReactNS from 'react';

export declare function setReact(r: typeof ReactNS): void;

export declare const Fragment: typeof ReactNS.Fragment;
export declare const StrictMode: typeof ReactNS.StrictMode;
export declare const Suspense: typeof ReactNS.Suspense;
export declare const createElement: typeof ReactNS.createElement;
export declare const cloneElement: typeof ReactNS.cloneElement;
export declare const isValidElement: typeof ReactNS.isValidElement;
export declare const createContext: typeof ReactNS.createContext;
export declare const createRef: typeof ReactNS.createRef;
export declare const forwardRef: typeof ReactNS.forwardRef;
export declare const memo: typeof ReactNS.memo;
export declare const lazy: typeof ReactNS.lazy;
export declare const startTransition: typeof ReactNS.startTransition;
export declare const useState: typeof ReactNS.useState;
export declare const useReducer: typeof ReactNS.useReducer;
export declare const useEffect: typeof ReactNS.useEffect;
export declare const useLayoutEffect: typeof ReactNS.useLayoutEffect;
export declare const useInsertionEffect: typeof ReactNS.useInsertionEffect;
export declare const useRef: typeof ReactNS.useRef;
export declare const useMemo: typeof ReactNS.useMemo;
export declare const useCallback: typeof ReactNS.useCallback;
export declare const useContext: typeof ReactNS.useContext;
export declare const useId: typeof ReactNS.useId;
export declare const useImperativeHandle: typeof ReactNS.useImperativeHandle;
export declare const useSyncExternalStore: typeof ReactNS.useSyncExternalStore;
export declare const useTransition: typeof ReactNS.useTransition;
export declare const useDeferredValue: typeof ReactNS.useDeferredValue;
export declare const useDebugValue: typeof ReactNS.useDebugValue;

declare const React: typeof ReactNS;
export default React;
