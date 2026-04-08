/**
 * @type {import('@stryker-mutator/api/core').StrykerOptions}
 */
// @ts-nocheck

module.exports = {
  mutate: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ],
  testRunner: 'jest',
  jest: {
    projectType: 'custom',
    config: require('./jest.config.js'),
  },
  tempDirName: '.stryker-tmp',
  reporters: ['html', 'clear-text', 'progress', 'json'],
  htmlReporter: {
    fileName: 'reports/mutation/mutation.html',
  },
  coverageAnalysis: 'off',
  tsconfigFile: './tsconfig.json',
  ignorePatterns: [
    '**/.stryker-tmp/**',
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '**/fuzz/**',
    '**/fuzzdb/**'
  ],
};
