const esbuild = require('esbuild');
const path = require('path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

const esbuildLoader = {
  test: /\.ts?$/,
  loader: 'esbuild-loader',
  options: {
    loader: 'ts',
    target: 'es2016',
    implementation: esbuild
  }
}

const commonAlias = {
  fs: false,
  'fs/promises': false,
  'path': false,
  'url': false,
  'worker_threads': false,
  'fflate': 'fflate/browser',
  '@colors/colors': false,
  'cli-table3': false,
  'commander': false,
  'http-proxy-agent': false,
  'https-proxy-agent': false,
  'socks-proxy-agent': false,
}

module.exports = [
  {
    mode: 'production',
    module: {
      rules: [esbuildLoader]
    },
    entry: './src/index.ts',
    output: {
      filename: 'index.umd.js',
      path: path.resolve(__dirname, './dist'),
      library: 'Tornado',
      libraryTarget: 'umd'
    },
    plugins: [
      new NodePolyfillPlugin(),
    ],
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        ...commonAlias,
      }
    },
    optimization: {
      minimize: false,
    }
  },
  {
    mode: 'production',
    module: {
      rules: [esbuildLoader]
    },
    entry: './src/merkleTreeWorker.ts',
    output: {
      filename: 'merkleTreeWorker.umd.js',
      path: path.resolve(__dirname, './dist'),
      libraryTarget: 'umd'
    },
    plugins: [
      new NodePolyfillPlugin(),
    ],
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        ...commonAlias,
      }
    },
    optimization: {
      minimize: false,
    }
  }
];
