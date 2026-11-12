import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // These four rules of eslint-plugin-react-hooks v7 check whether a component is eligible for the
    // React Compiler (refs read/written during render, setState inside an effect, ...). This project
    // does not enable the compiler, and the flagged code is deliberate: the "latest value in a ref"
    // pattern stands in for Angular signals so a long-lived pointer/rAF listener reads current props
    // without re-subscribing. They stay visible as warnings so a future move to the compiler has a
    // worklist; `rules-of-hooks` and `exhaustive-deps` (real correctness rules) remain errors.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
