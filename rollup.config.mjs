import esbuild from 'rollup-plugin-esbuild';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { readFileSync } from 'fs';

const pkgJson = JSON.parse(readFileSync("./package.json"));

const external = Object.keys(pkgJson.dependencies).concat(
  Object.keys(pkgJson.optionalDependencies || {}),
  [
    'http-proxy-agent',
    'https-proxy-agent',
    'socks-proxy-agent',
    '@tornado/websnark/src/utils',
    '@tornado/websnark/src/groth16',
  ]
);

const config = [
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkgJson.main,
        format: "cjs",
        esModule: false,
      },
    ],
    external,
    plugins: [
      esbuild({
        include: /\.[jt]sx?$/,
        minify: false,
        sourceMap: true,
        target: 'es2016',
      }),
      commonjs(),
      nodeResolve(),
      json()
    ],
  },
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkgJson.module,
        format: "esm",
      },
    ],
    external,
    plugins: [
      esbuild({
        include: /\.[jt]sx?$/,
        minify: false,
        sourceMap: true,
        target: 'es2016',
      }),
      nodeResolve(),
      json()
    ],
  },
  {
    input: 'src/merkleTreeWorker.ts',
    output: [
      {
        file: 'dist/merkleTreeWorker.js',
        format: "cjs",
        esModule: false,
      },
    ],
    treeshake: 'smallest',
    plugins: [
      esbuild({
        include: /\.[jt]sx?$/,
        minify: false,
        sourceMap: true,
        target: 'es2016',
      }),
      commonjs(),
      nodeResolve(),
      json()
    ],
  }
]

export default config;