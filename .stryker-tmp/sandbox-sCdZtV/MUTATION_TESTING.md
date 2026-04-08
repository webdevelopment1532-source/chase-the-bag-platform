# Mutation Testing for Test Suite Quality

## Why Mutation Testing?
- Mutation testing checks if your tests actually catch real bugs by making small changes (mutations) to your code and verifying that tests fail as expected.
- Ensures your test suite is not just high coverage, but high quality.

## Recommended Tool: Stryker
- [Stryker](https://stryker-mutator.io/) is the leading mutation testing framework for JavaScript/TypeScript.

## Setup
1. Install Stryker:
   ```sh
   npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner
   ```
2. Create a `stryker.conf.js`:
   ```js
   module.exports = function(config) {
     config.set({
       mutate: ['src/**/*.ts'],
       testRunner: 'jest',
       reporters: ['html', 'clear-text', 'progress'],
       coverageAnalysis: 'off',
     });
   };
   ```
3. Run mutation tests:
   ```sh
   npx stryker run
   ```

## CI Integration
- Add mutation testing to your CI pipeline and fail builds if mutation score drops below a threshold (e.g., 80%).

## References
- [Stryker Docs](https://stryker-mutator.io/docs/)
