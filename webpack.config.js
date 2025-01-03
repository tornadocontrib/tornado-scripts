const { BannerPlugin } = require('webpack');
const path = require('path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

const commonRules = [
    {
        test: /\.ts?$/,
        loader: 'esbuild-loader',
        options: {
            loader: 'ts',
            target: 'es2022',
        }
    },
    // Disable strict dependency resolution for ESM modules, so that polyfill plugin can handle the rest
    {
        test: /\.m?js$/,
        resolve: {
            fullySpecified: false
        }
    }
]

const commonAlias = {
    fs: false,
    'path': false,
    'url': false,
    'worker_threads': false,
    'fflate': 'fflate/browser',
    'http-proxy-agent': false,
    'https-proxy-agent': false,
    'socks-proxy-agent': false,
}

module.exports = [
    {
        mode: 'production',
        module: {
            rules: [...commonRules]
        },
        entry: './src/index.ts',
        output: {
            filename: 'tornado.umd.js',
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
            rules: [...commonRules]
        },
        entry: './src/index.ts',
        output: {
            filename: 'tornado.umd.min.js',
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
    },
    {
        mode: 'production',
        module: {
            rules: [...commonRules]
        },
        entry: './src/merkleTreeWorker.ts',
        output: {
            filename: 'merkleTreeWorker.umd.js',
            path: path.resolve(__dirname, './dist'),
            libraryTarget: 'umd'
        },
        plugins: [
            new NodePolyfillPlugin(),
            new BannerPlugin({
                banner: 'globalThis.process = { browser: true, env: {}, };\n',
                raw: true,
            }),
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
            rules: [...commonRules]
        },
        entry: './src/merkleTreeWorker.ts',
        output: {
            filename: 'merkleTreeWorker.umd.min.js',
            path: path.resolve(__dirname, './dist'),
            libraryTarget: 'umd'
        },
        plugins: [
            new NodePolyfillPlugin(),
            new BannerPlugin({
                banner: 'globalThis.process = { browser: true, env: {}, };',
                raw: true,
            }),
        ],
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            alias: {
                ...commonAlias,
            }
        },
    },
    {
        mode: 'production',
        module: {
            rules: [...commonRules]
        },
        entry: './src/contracts.ts',
        output: {
            filename: 'tornadoContracts.umd.js',
            path: path.resolve(__dirname, './dist'),
            library: 'TornadoContracts',
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
            rules: [...commonRules]
        },
        entry: './src/contracts.ts',
        output: {
            filename: 'tornadoContracts.umd.min.js',
            path: path.resolve(__dirname, './dist'),
            library: 'TornadoContracts',
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
    },
];
