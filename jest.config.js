export default {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testMatch: ["<rootDir>/test/**/*.test.ts"],
  moduleDirectories: ["node_modules", "src", "<rootDir>/src", "<rootDir>"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/coverage/",
    "/.stryker-tmp/",
    "/stryker-tmp/",
    ".*.js$",
    ".*.d.ts$",
  ],
  coverageDirectory: "<rootDir>/coverage/jest-coverage",
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/coverage/",
    "/.stryker-tmp/",
    "/stryker-tmp/",
  ],
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "<rootDir>/coverage/jest-results",
        outputName: "junit.xml",
      },
    ],
  ],
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
