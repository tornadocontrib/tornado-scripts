module.exports = {
    env: {
        es2021: true,
        node: true,
    },
    extends: [
        'prettier',
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'plugin:prettier/recommended',
    ],
    overrides: [
        {
            env: {
                node: true,
            },
            files: ['.eslintrc.{js,cjs}'],
            parserOptions: {
                sourceType: 'script',
            },
        },
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint', 'prettier'],
    rules: {
        'prettier/prettier': [
            'error',
            {
                tabWidth: 4,
                printWidth: 120,
                singleQuote: true,
            },
        ],
        'import/order': ['error'],
        '@typescript-eslint/no-unused-vars': ['warn'],
        '@typescript-eslint/no-unused-expressions': ['off'],
    },
};
