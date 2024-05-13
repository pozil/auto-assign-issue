const js = require('@eslint/js');
const globals = require('globals');
const jest = require('eslint-plugin-jest');

module.exports = [
    js.configs.recommended,
    {
        plugins: {
            jest
        },
        languageOptions: {
            ecmaVersion: 2020,
            globals: {
                ...globals.node,
                ...globals.jest
            }
        }
    }
];
