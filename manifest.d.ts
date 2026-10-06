/**
 * Types of manifest.json (SDK 0.2, contract version 3). The reference, with every validation rule, is
 * https://github.com/Ervisio/ervisio/blob/main/docs/api/plugins.md ("manifest.json").
 */

/** Section hues a plugin may use as its colour. */
export type HueId = 'ov' | 'term' | 'file' | 'log' | 'svc' | 'sw' | 'usr' | 'plg';

/** A call argument of a command: the value must match `pattern` completely. */
export interface CommandArg {
  pattern: string;
  /** Allow values starting with "-" (refused by default). */
  allowDash?: boolean;
  /** Default 256. */
  maxLen?: number;
}

/** A command the plugin may run (capabilities.commands). */
export interface Command {
  name: string;
  description?: string;
  /** argv[0] is fixed; "{N}" slots take the Nth call argument. */
  argv: string[];
  args?: CommandArg[];
  /** Needs administrator rights (the root bridge). */
  admin?: boolean;
  /** Members of this group run the admin command as themselves. */
  adminUnlessGroup?: string;
  /** Default 30, max 600. */
  timeoutSec?: number;
  /** Runs only in a terminal through sdk.api.pty (SDK v3). */
  pty?: boolean;
  /**
   * SDK 0.2: "docker" lets the command run against an environment (sdk.api.exec(..., { env })). argv[0] must be
   * `docker` and argv must hold exactly one `{env}` item, which the daemon replaces with the environment's address.
   */
  remote?: 'docker';
  /** SDK 0.3: systems this entry is for (Ervisio 0.6.2). Missing = all the plugin's `platforms`. Two entries may share a name when their systems do not overlap; the daemon uses the one for its system. */
  platforms?: Platform[];
}

/** One rule of an HTTP API: methods allowed on paths matching the regular expression. */
export interface HttpRule {
  methods: Array<'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'>;
  /** Go regular expression matched against the whole decoded URL path. */
  path: string;
}

/** An HTTP API on a unix socket (capabilities.http, SDK v3). */
export interface HttpApi {
  name: string;
  socket: string;
  admin?: boolean;
  adminUnlessGroup?: string;
  /** The only request headers the plugin may set. */
  headers?: string[];
  rules: HttpRule[];
  /** Default 8 MiB, max 64 MiB. */
  maxBody?: number;
  /** SDK 0.2: largest file sdk.api.upload may send to this API (default 20 GiB, max 1 TiB). Uploads are streamed. */
  maxUpload?: number;
  /** SDK 0.2: "docker" lets calls go to an environment (`env` option) instead of `socket`. */
  remote?: 'docker';
  /** Default 30, max 600. */
  timeoutSec?: number;
  /**
   * SDK 0.3: systems this entry is for (Ervisio 0.6.2). In an entry for `["windows"]` alone, `socket` may be a named
   * pipe, `\\.\pipe\docker_engine`.
   */
  platforms?: Platform[];
}

/** A capabilities.files entry: a path, or an object with options (SDK v3). */
/** A system Ervisio runs on. */
export type Platform = 'linux' | 'windows';

/** A capabilities.files entry. SDK 0.3: `platforms` limits it to some systems (Windows paths are `C:\\dir`). */
export type Folder = string | { path: string; admin?: boolean; adminUnlessGroup?: string; create?: boolean; platforms?: Platform[] };

/** A parameter of a job: the whole value must match `pattern`. */
export interface JobParam {
  /** ^[a-z][a-z0-9_]{0,23}$ */
  name: string;
  /** Go regular expression the whole value must match. */
  pattern: string;
  /** Default 256, max 1024. */
  maxLen?: number;
  /** Must match the pattern; a param without a default is required. */
  default?: string;
  description?: string;
}

/** "ok", "failed", "changed", "unchanged", "differs" or "same" (with `other`) on an earlier step. */
export interface JobCondition {
  step: string;
  when: 'ok' | 'failed' | 'changed' | 'unchanged' | 'differs' | 'same';
  /** For differs and same: the step to compare with. */
  other?: string;
}

/**
 * A step of a job: exactly one of `command` (+ `args`), `http` or `notify`. Text takes the placeholders {param.x},
 * {step.id.stdout|stderr|exitCode|status|body}, {job}, {instance} and {plugin}.
 */
export interface JobStep {
  /** ^[a-z][a-z0-9_]{0,23}$, unique in the job. */
  id: string;
  if?: JobCondition;
  /** The failure is recorded as handled and does not fail the run. */
  continueOnError?: boolean;
  /**
   * Command steps only (Ervisio 0.5.0): replaces the command's own `timeoutSec` (default 30, max 600) for this step, up
   * to 21600 (6 h), for work such as a volume backup. Cannot exceed the job's `timeoutSec`, so raise both.
   */
  timeoutSec?: number;
  /** A declared, non-pty command. `args` has one text per argument slot of the command. */
  command?: string;
  args?: string[];
  /** A call to a declared HTTP API. `path`, `query` and header values take {param.x} only; `body` also {step.id.field}. */
  http?: { api: string; method: string; path: string; query?: string; headers?: Record<string, string>; body?: string; json?: boolean };
  /** Needs capabilities.notify. */
  notify?: { title: string; body?: string; level?: 'info' | 'success' | 'warn' | 'error'; link?: string };
}

/** A background job a plugin may create instances of (capabilities.jobs, SDK 0.2; at most 16 jobs, 16 steps and 8 params). */
export interface JobDef {
  name: string;
  description?: string;
  params?: JobParam[];
  steps: JobStep[];
  /** For the whole run. Default 300, max 21600 (6 h). */
  timeoutSec?: number;
  /** The params a webhook call may set. */
  webhook?: { params: string[] };
}

export interface Capabilities {
  commands?: Command[];
  http?: HttpApi[];
  files?: { read?: Folder[]; write?: Folder[] };
  /** Informational: the sockets the plugin's commands talk to. */
  sockets?: string[];
  /**
   * Hosts the plugin frame may reach over https/wss. A list, or (SDK 0.2) `{ hosts, userHosts: true }`: with `userHosts`
   * the plugin may ask an administrator to approve more hosts at run time (sdk.network.request).
   */
  network?: string[] | { hosts: string[]; userHosts?: boolean };
  /** SDK 0.2: background jobs, run by the daemon on a schedule or from a webhook. */
  jobs?: JobDef[];
  /** SDK 0.2: lets the plugin send notifications (sdk.api.notify and job `notify` steps). */
  notify?: boolean;
}

export interface Contribution {
  id: string;
  title: string;
  icon?: string;
}

export interface Contributes {
  pages?: Contribution[];
  widgets?: Contribution[];
  snippets?: Array<{ name: string; command: string }>;
}

export interface Manifest {
  /** ^[a-z][a-z0-9-]{1,39}$, equal to the folder name. */
  id: string;
  name: string;
  /** Semantic version. */
  version: string;
  author?: string;
  description?: string;
  homepage?: string;
  icon?: string;
  color?: HueId;
  /** Relative path of the single ES module. */
  entry: string;
  /**
   * The oldest Ervisio the plugin needs, `"0.5.0"` (read by Ervisio 0.5.0 and later). A core that is older refuses to install, enable or
   * run it, with a message that says which version it needs. Same as `requires.ervisio`; the higher one counts.
   * Older cores refuse a manifest with this field ("unknown field").
   */
  minCore?: string;
  /** `{ ervisio: ">=0.5.0" }`: another spelling of `minCore`. Only `>=` or a bare version is understood. */
  requires?: { ervisio?: string };
  /**
   * SDK 0.3: the systems the plugin works on (Ervisio 0.6.1). Missing = Linux only. On another system the plugin is
   * shown with a Linux/Windows mark but cannot be installed, enabled or run. Older cores refuse the field ("unknown
   * field"), so add `minCore: "0.6.1"` with it.
   */
  platforms?: Platform[];
  /** sha256 of every file; written by the signer, never by hand. */
  files?: Record<string, string>;
  capabilities?: Capabilities;
  contributes?: Contributes;
  visibleTo?: { groups?: string[] };
}
