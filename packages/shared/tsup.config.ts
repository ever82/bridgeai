import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  external: ['dotenv'],
  outDir: 'dist',
  tsconfig: './tsconfig.json',
  skipNodeModulesBundle: true,
  clean: false,
});
