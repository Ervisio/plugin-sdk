import { defineConfig } from 'vite';
import { ervisioPlugin } from '@ervisio/plugin-sdk/vite';

// One self-contained ES module at dist/hello/index.js; `react` is the SDK's (see @ervisio/plugin-sdk/react).
export default defineConfig(ervisioPlugin({ id: 'hello', entry: 'src/index.ts' }));
