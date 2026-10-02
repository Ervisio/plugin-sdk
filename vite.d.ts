import type { UserConfig } from 'vite';

export interface ErvisioPluginOptions {
  /** Entry module (default "src/index.ts"). Its default export is activate(sdk). */
  entry?: string;
  /** Output folder. Default "dist/<id>" when id is set; one of the two is required. */
  outDir?: string;
  /** Plugin id, used for the default outDir. */
  id?: string;
  /** Bundle file name (default "index.js", the manifest's entry). */
  fileName?: string;
  /** Empty outDir before building (default false: it also holds the copied manifest and assets). */
  emptyOutDir?: boolean;
  /** Minify the bundle (default true). */
  minify?: boolean;
  /** Extra Vite config, merged with mergeConfig. */
  config?: UserConfig;
}

export declare function ervisioPlugin(options?: ErvisioPluginOptions): UserConfig;
export default ervisioPlugin;
