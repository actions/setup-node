// This is a reusable configuration file copied from https://github.com/actions/reusable-workflows/tree/main/reusable-configurations. Please don't make changes to this file as it's the subject of an automatic update.
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:eslint-plugin-jest/recommended',
    'eslint-config-prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'eslint-plugin-node', 'eslint-plugin-jest'],
  rules: {
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
    'yoda': 'error',
    'prefer-const': [
      'error',
      {
        destructuring: 'all'
      }
    ],
    'no-control-regex': 'off',
    'no-constant-condition': ['error', {checkLoops: false}],
    'node/no-extraneous-import': 'error'
  },
  overrides: [
    {
      files: ['**/*{test,spec}.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        'jest/no-standalone-expect': 'off',
        'jest/no-conditional-expect': 'off',
        'no-console': 'off',

      }
    }
  ],
  env: {
    node: true,
    es6: true,
    'jest/globals': true
  }
};
