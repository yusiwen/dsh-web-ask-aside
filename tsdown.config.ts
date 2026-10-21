import { defineConfig } from 'tsdown'
import manifest from './package.json' with { type: 'json' }

export default defineConfig([
  {
    // Host face: ESM for the DSH Loader. Peers stay external.
    entry: { index: 'src/index.ts' },
    format: 'esm',
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: true,
    outDir: 'lib',
  },
  {
    // Browser face: one factory for DSH's module loader. React and every
    // @deepseek-ai/* module come from the shell's module table.
    entry: { client: 'src/client/index.ts' },
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    outDir: 'lib',
    clean: false,
    dts: false,
    minify: false,
    deps: {
      neverBundle: (id: string) =>
        id === 'react' || id.startsWith('react/') || id.startsWith('@deepseek-ai/'),
    },
    outputOptions: {
      entryFileNames: 'client.cjs',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(manifest.name)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
    },
  },
])
