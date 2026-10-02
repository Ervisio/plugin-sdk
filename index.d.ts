/**
 * Types of the Ervisio plugin SDK, contract version 3. The SDK object is handed to your module's activate(sdk).
 * Reference: docs/sdk.md in https://github.com/Ervisio/plugin-sdk.
 */
import type * as ReactNS from 'react';

export * from './manifest';

/** Errors from api.*, files.* and asset() carry a code. */
export interface PluginError extends Error {
  /** forbidden, invalid, not_found, needs_admin, unavailable, ... */
  code: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  truncated?: boolean;
}

/** An object ({k: v} or {k: [v1, v2]}, encoded with URLSearchParams) or a raw query string. */
export type Query = Record<string, string | string[]> | string;

export interface HttpRequest {
  method: string;
  /** URL path without query string; it must match a rule of the manifest. */
  path: string;
  query?: Query;
  /** Only headers listed in the manifest's `headers`. */
  headers?: Record<string, string>;
  /** An object is sent as JSON, a string as is, a Uint8Array as bytes. */
  body?: string | Uint8Array | object;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  json(): any;
  bytes(): Uint8Array;
}

export interface HttpStreamHandlers {
  onStart?(status: number, headers: Record<string, string>): void;
  onData(chunk: Uint8Array): void;
  onEnd(): void;
  onError(err: PluginError): void;
}

export interface ExecStreamHandlers {
  onLine?(stream: 'stdout' | 'stderr', line: string): void;
  onExit?(code: number): void;
  onError?(err: PluginError): void;
}

export interface PtyOptions {
  cols: number;
  rows: number;
  onData(chunk: Uint8Array): void;
  onExit(code: number): void;
  onError(err: PluginError): void;
}

export interface PtyHandle {
  write(data: string | Uint8Array): void;
  resize(cols: number, rows: number): void;
  close(): void;
}

export interface Closable {
  close(): void;
}

export interface FileEntry {
  name: string;
  type: 'file' | 'dir' | 'link' | 'other';
  size: number;
  mtime: number;
}

export interface Theme {
  id: string;
  name: string;
  kind: 'dark' | 'light';
  vars: Record<string, string>;
}

/** A page or widget view: a React component, or framework-free render(container) returning an optional cleanup. */
export type View<P = { sdk: PluginSDK }> =
  | ReactNS.ComponentType<P>
  | { render(container: HTMLElement, sdk: PluginSDK): void | (() => void) };

export interface PluginSDK {
  /** 3 for this contract. Check it when you also support older consoles. */
  version: number;
  plugin: { id: string; name: string; version: string };
  /** What this frame shows. */
  view: { kind: 'page' | 'widget'; id: string };
  /** React 18, shared by the runtime and the UI kit. Do not bundle your own React. */
  react: typeof ReactNS;
  /** The app's component kit (Button, Dialog, Table, toast, ...). */
  ui: Record<string, any>;
  api: {
    exec(command: string, args?: string[]): Promise<ExecResult>;
    execStream(command: string, args: string[], h: ExecStreamHandlers): Closable;
    http(name: string, req: HttpRequest): Promise<HttpResponse>;
    httpStream(name: string, req: HttpRequest, h: HttpStreamHandlers): Closable;
    pty(command: string, args: string[], o: PtyOptions): PtyHandle;
  };
  files: {
    read(path: string): Promise<string>;
    readBytes(path: string): Promise<Uint8Array>;
    write(path: string, data: string | Uint8Array): Promise<void>;
    list(path: string): Promise<FileEntry[]>;
    mkdir(path: string): Promise<void>;
    remove(path: string): Promise<void>;
  };
  /** Fetches a file of the plugin folder and returns a blob: URL. */
  asset(path: string): Promise<string>;
  /** Opens one of the plugin's own pages. */
  open(pageId: string): void;
  /** Opens an http:// or https:// address in a new tab (call it from a click handler). */
  openExternal(url: string): void;
  registerPage(id: string, view: View | unknown): void;
  registerWidget(def: { id: string; title?: string; render: View | unknown }): void;
  registerStrings(dicts: Record<string, Record<string, string>>): void;
  /** No-op kept for v1 plugins; declare snippets in the manifest. */
  registerSnippet?(...args: unknown[]): void;
  t(key: string, vars?: Record<string, string | number>): string;
  lang(): string;
  theme: { get(): Theme; onChange(cb: () => void): () => void };
}

/** The default export of a plugin module. */
export type Activate = (sdk: PluginSDK) => void | Promise<void>;

/** Stores the SDK object handed to activate(). */
export declare function setSdk(sdk: PluginSDK): void;
/** Returns the SDK object stored by setSdk(); throws before activate() ran. */
export declare function getSdk(): PluginSDK;
/** The SDK contract version these types describe (3). */
export declare const SDK_VERSION: number;
