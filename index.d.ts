/**
 * Types of the Ervisio plugin SDK 0.2 (contract version 3). The SDK object is handed to your module's activate(sdk).
 * SDK 0.2 needs Ervisio 0.5 or later for large transfers, saveFile, the activity log, environments and approved
 * hosts, and for api.jobs / api.notify; on older consoles those members are missing: check before you use them.
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
  /** Id of an environment from sdk.envs.list(); the API must declare `remote` in the manifest. */
  env?: string;
}

/** Options of exec, execStream and pty. */
export interface EnvOptions {
  /** Id of an environment from sdk.envs.list(); the command must declare `remote` in the manifest. */
  env?: string;
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
  /** Id of an environment from sdk.envs.list(); the command must declare `remote`. */
  env?: string;
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

/** What api.download resolves with, when the browser starts saving. */
export interface DownloadStarted {
  /** The name the browser saves the file as (cleaned by the daemon). */
  filename: string;
  /** Bytes, when the service sent a Content-Length. */
  size?: number;
  status?: number;
}

/** Options of api.upload. With onResponseStart or onResponseData the response is streamed and the result's body is empty. */
export interface UploadOptions {
  onProgress?(p: { loaded: number; total: number }): void;
  onResponseStart?(status: number, headers: Record<string, string>): void;
  onResponseData?(chunk: Uint8Array): void;
}

/** An upload in progress: a promise with cancel(). */
export type UploadHandle = Promise<HttpResponse & { truncated: boolean }> & { cancel(): void };

/** Filters of audit.list. */
export interface AuditQuery {
  user?: string;
  action?: string;
  /** Substring of the target or message. */
  text?: string;
  /** Milliseconds since the epoch, or an ISO 8601 time. */
  since?: number | string;
  until?: number | string;
  /** 1 to 1000 (default 100). */
  limit?: number;
  /** `next` of the previous page. */
  cursor?: string;
}

/** One line of the activity log. Secrets are never stored. */
export interface AuditEntry {
  time: string;
  user: string;
  ip?: string;
  source: 'plugin' | 'core';
  plugin?: string;
  /** command, pty, http, upload, download, file.write, file.mkdir, file.remove, job.run, job.webhook, job.approve (plugins); login, settings... (console). */
  action: string;
  /** The HTTP API a request went to. */
  via?: string;
  /** "METHOD /path?query" or "command arg arg": secrets are removed. */
  target?: string;
  result: 'ok' | 'failed' | 'denied' | 'error';
  /** Exit code or HTTP status. */
  code?: number;
  bytes?: number;
  admin?: boolean;
  detail?: string;
  /** The environment the call was for, when it was not this machine. */
  env?: string;
  /** "via <server> by <user>" when a paired Ervisio server proxied the call; "job <name>" or "webhook" for background jobs. */
  origin?: string;
}

/** An environment an administrator configured (Settings › Environments) that the user may use. Never holds secrets. */
export interface PluginEnv {
  id: string;
  name: string;
  kind: 'tcp-tls' | 'ssh' | 'portainer-agent' | 'ervisio';
  status?: { reachable: boolean; engineVersion?: string; apiVersion?: string; latencyMs: number; error?: string; checked: string };
}

export type JobSchedule = { every: number } | { at: string[]; days?: number[] };

/** A job instance a plugin created (see docs/sdk.md, "Background jobs"). */
export interface JobInstance {
  id: string;
  plugin: string;
  job: string;
  name: string;
  params: Record<string, string>;
  schedule?: { every?: number; at?: string[]; days?: number[] };
  owner: string;
  enabled: boolean;
  disabledReason?: string;
  needsAdmin: boolean;
  approval?: { by: string; at: number; valid: boolean };
  webhooks: { id: string; label?: string; created: number; lastUsed?: number }[];
  running: boolean;
  nextRun?: number;
  last?: { id: string; trigger: string; status: string; started: number; ended?: number; error?: string };
}

export interface JobRun {
  id: string;
  instance: string;
  trigger: 'schedule' | 'manual' | 'webhook';
  by?: string;
  started: number;
  ended?: number;
  status: 'queued' | 'running' | 'ok' | 'failed' | 'timeout' | 'cancelled';
  error?: string;
  steps: {
    id: string;
    kind: string;
    status: 'ok' | 'failed' | 'skipped';
    exitCode?: number;
    httpStatus?: number;
    stdout?: string;
    stderr?: string;
    error?: string;
    admin?: boolean;
    handled?: boolean;
  }[];
}

export interface WebhookCreated {
  id: string;
  label?: string;
  /** Shown once. */
  token: string;
  /** Build the URL as location.origin + path. */
  path: string;
}

export interface JobsApi {
  create(o: {
    job: string;
    name?: string;
    params?: Record<string, string>;
    schedule?: JobSchedule;
    runAs?: string;
    enabled?: boolean;
    /** Needed when the job runs steps with administrator rights and the caller is an administrator. */
    confirmAdmin?: boolean;
  }): Promise<JobInstance>;
  list(o?: { job?: string }): Promise<JobInstance[]>;
  get(id: string): Promise<JobInstance>;
  update(
    id: string,
    patch: { name?: string; params?: Record<string, string>; schedule?: JobSchedule | null; enabled?: boolean; confirmAdmin?: boolean },
  ): Promise<JobInstance>;
  delete(id: string): Promise<void>;
  runNow(id: string): Promise<{ run: string }>;
  history(id: string, limit?: number): Promise<JobRun[]>;
  webhooks: {
    create(id: string, label?: string): Promise<WebhookCreated>;
    regenerate(id: string, webhook: string): Promise<WebhookCreated>;
    revoke(id: string, webhook: string): Promise<void>;
  };
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
    exec(command: string, args?: string[], o?: EnvOptions): Promise<ExecResult>;
    execStream(command: string, args: string[], h: ExecStreamHandlers, o?: EnvOptions): Closable;
    http(name: string, req: HttpRequest): Promise<HttpResponse>;
    httpStream(name: string, req: HttpRequest, h: HttpStreamHandlers): Closable;
    /** SDK 0.2: the browser saves the response of a GET to an HTTP API as a file, streamed to the disk with no size limit. Resolves when the download starts. */
    download(name: string, req: HttpRequest, filename?: string): Promise<DownloadStarted>;
    /** SDK 0.2: same for the standard output of a declared (non-pty) command. */
    downloadCommand(command: string, args: string[], filename?: string, o?: EnvOptions): Promise<DownloadStarted>;
    /** SDK 0.2: sends a File or Blob as the body of a POST or PUT, streamed with progress, up to the API's `maxUpload` (default 20 GiB). `req.body` is not used. */
    upload(name: string, req: Omit<HttpRequest, 'body'>, file: Blob, opts?: UploadOptions | ((p: { loaded: number; total: number }) => void)): UploadHandle;
    /** SDK 0.2: saves data the plugin holds (a string, bytes or a Blob, at most 64 MiB) as a browser download. */
    saveFile(filename: string, data: string | Uint8Array | Blob, mime?: string): Promise<{ filename: string; size: number }>;
    pty(command: string, args: string[], o: PtyOptions): PtyHandle;
    /** SDK 0.2: background jobs (capabilities.jobs). Missing on consoles older than Ervisio 0.5. */
    jobs?: JobsApi;
    /** SDK 0.2: sends a notification to the channels an administrator configured (needs capabilities.notify). Missing on consoles older than Ervisio 0.5. */
    notify?(n: { title: string; body?: string; level?: 'info' | 'success' | 'warn' | 'error'; link?: string }): Promise<{ channels: number; delivered: number; failed: number }>;
  };
  /** Same as `api.saveFile`. */
  saveFile(filename: string, data: string | Uint8Array | Blob, mime?: string): Promise<{ filename: string; size: number }>;
  /** SDK 0.2: the activity log, limited to this plugin's entries. Everyone sees their own; administrators see all users. */
  audit: {
    list(q?: AuditQuery): Promise<{ entries: AuditEntry[]; next: string; enabled: boolean }>;
  };
  /** SDK 0.2: environments (remote Docker hosts) the signed-in user may use. Pass an id as `env` to http, httpStream, exec, execStream, pty, download or upload. */
  envs: { list(): Promise<PluginEnv[]> };
  /** SDK 0.2: hosts beyond the manifest's capabilities.network list (needs capabilities.network.userHosts). */
  network: {
    /** Asks an administrator once to approve `host` (exact host:port; https unless approved as http). Resolves when approved; the app then reloads the plugin's frames. Rejects with code "forbidden" when refused. */
    request(host: string, o?: { scheme?: 'https' | 'http' }): Promise<{ host: string; approved: true; reloading: boolean }>;
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
