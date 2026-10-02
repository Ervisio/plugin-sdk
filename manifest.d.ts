/**
 * Types of manifest.json (SDK contract version 3). The reference, with every validation rule, is
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
  /** Default 30, max 600. */
  timeoutSec?: number;
}

/** A capabilities.files entry: a path, or an object with options (SDK v3). */
export type Folder = string | { path: string; admin?: boolean; adminUnlessGroup?: string; create?: boolean };

export interface Capabilities {
  commands?: Command[];
  http?: HttpApi[];
  files?: { read?: Folder[]; write?: Folder[] };
  /** Informational: the sockets the plugin's commands talk to. */
  sockets?: string[];
  /** Hosts the plugin frame may reach over https/wss. */
  network?: string[];
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
  /** sha256 of every file; written by the signer, never by hand. */
  files?: Record<string, string>;
  capabilities?: Capabilities;
  contributes?: Contributes;
  visibleTo?: { groups?: string[] };
}
