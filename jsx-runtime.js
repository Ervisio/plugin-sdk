// Automatic JSX runtime on top of the SDK's React (see react.js). The Vite
// preset aliases react/jsx-runtime and react/jsx-dev-runtime here.
import { createElement, Fragment } from './react.js';

export { Fragment };

export function jsx(type, props, key) {
  const { children, ...rest } = props;
  if (key !== undefined) rest.key = key;
  return children === undefined ? createElement(type, rest) : createElement(type, rest, children);
}

export function jsxs(type, props, key) {
  const { children, ...rest } = props;
  if (key !== undefined) rest.key = key;
  return createElement(type, rest, ...children);
}

export const jsxDEV = jsx;
