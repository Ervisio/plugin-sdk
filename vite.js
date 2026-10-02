// Vite preset for Ervisio plugins: one self-contained ES module, React never
// bundled (`react` and the JSX runtime are aliased to the SDK shims, which
// forward to sdk.react).
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';

const shim = (f) => fileURLToPath(new URL(`./${f}`, import.meta.url));

/**
 * Returns a Vite config that builds `entry` into `<outDir>/<fileName>`.
 *
 * @param {import('./vite').ErvisioPluginOptions} options
 * @returns {import('vite').UserConfig}
 */
export function ervisioPlugin(options = {}) {
  const { entry = 'src/index.ts', outDir, id, fileName = 'index.js', emptyOutDir = false, minify = true, config = {} } = options;
  const dir = outDir ?? (id ? `dist/${id}` : undefined);
  if (!dir) throw new Error('ervisioPlugin: set outDir (for example "dist/my-plugin") or id.');
  const base = {
    resolve: {
      alias: [
        { find: /^react\/jsx-(dev-)?runtime$/, replacement: shim('jsx-runtime.js') },
        { find: /^react$/, replacement: shim('react.js') },
      ],
    },
    build: {
      target: 'es2022',
      outDir: dir,
      // The folder also holds manifest.json and other assets copied next to the bundle.
      emptyOutDir,
      minify,
      sourcemap: false,
      cssCodeSplit: false,
      lib: { entry, formats: ['es'], fileName: () => fileName },
      // Lib mode keeps whitespace and may split chunks otherwise.
      rolldownOptions: { output: { codeSplitting: false, minify } },
    },
  };
  return mergeConfig(base, config);
}

export default ervisioPlugin;
