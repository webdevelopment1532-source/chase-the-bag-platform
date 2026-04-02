module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test', '<rootDir>/tests'],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  resetModules: true,
  forceExit: true,
  testTimeout: 30000,
  moduleNameMapper: {
    '^node-fetch$': '<rootDir>/test/__mocks__/node-fetch.js',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/'],
};
