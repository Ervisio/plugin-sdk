// @ervisio/plugin-sdk: runtime helpers. Types are in index.d.ts.
//
// The SDK object exists only once the app calls your activate(sdk). Store it
// with setSdk() first thing in activate, then read it with getSdk() inside
// functions and components, never at import time.

let current;

/** Stores the SDK object handed to activate(). */
export function setSdk(sdk) {
  current = sdk;
}

/** Returns the SDK object stored by setSdk(); throws before activate() ran. */
export function getSdk() {
  if (!current) throw new Error('The Ervisio SDK is not ready: call setSdk(sdk) in activate() first.');
  return current;
}

/** The SDK contract version these types describe. */
export const SDK_VERSION = 3;
