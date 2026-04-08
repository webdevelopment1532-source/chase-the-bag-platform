// @ts-nocheck
const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  moduleDirectories: ["node_modules", "src", "<rootDir>/src", "<rootDir>"],
  coverageDirectory: "./coverage/jest-coverage",
  setupFilesAfterEnv: ["<rootDir>/test/setup-global-mock-db.ts"],
  reporters: [
    "default",
    ["jest-junit", {
      outputDirectory: "./coverage/jest-results",
      outputName: "junit.xml"
    }]
  ],
};