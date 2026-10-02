/** Automatic JSX runtime on top of the SDK's React. TypeScript reads JSX types from @types/react. */
export { Fragment } from './react';
export declare function jsx(type: unknown, props: Record<string, unknown>, key?: string): unknown;
export declare function jsxs(type: unknown, props: Record<string, unknown>, key?: string): unknown;
export declare const jsxDEV: typeof jsx;
