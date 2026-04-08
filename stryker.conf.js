/**
 * @type {import('@stryker-mutator/api/core').StrykerOptions}
 */
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
  tempDirName: '/run/media/cyber44/e7e278fe-0fb7-4d32-bb48-8e6959402b8f/stryker-tmp',
  reporters: ['html', 'clear-text', 'progress', 'json'],
  htmlReporter: {
    fileName: '/run/media/cyber44/e7e278fe-0fb7-4d32-bb48-8e6959402b8f/stryker-tmp/reports/index.html',
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
