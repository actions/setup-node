// This is a reusable configuration file copied from https://github.com/actions/reusable-workflows/tree/main/reusable-configurations. Please don't make changes to this file as it's the subject of an automatic update.
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import jest from 'eslint-plugin-jest';
import n from 'eslint-plugin-n';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: ['**/*', '!src/**', '!__tests__/**']
  },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2015
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      n
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': 'allow-with-description'
        }
      ],
      'no-console': 'error',
      yoda: 'error',
      'prefer-const': [
        'error',
        {
          destructuring: 'all'
        }
      ],
      'no-control-regex': 'off',
      'no-constant-condition': ['error', {checkLoops: false}],
      'no-useless-assignment': 'off',
      'n/no-extraneous-import': 'error'
    }
  },
  {
    files: ['**/*{test,spec}.ts'],
    plugins: {jest},
    languageOptions: {
      globals: {
        ...globals.jest
      }
    },
    rules: {
      ...jest.configs['flat/recommended'].rules,
      '@typescript-eslint/no-unused-vars': 'off',
      'jest/no-standalone-expect': 'off',
      'jest/no-conditional-expect': 'off',
      'no-console': 'off'
    }
  },
  prettier
];
