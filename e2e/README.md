# E2E & Performance Test Suite

## How to Run E2E Tests (Cypress)

1. Install Cypress if not already installed:
   ```bash
   npm install --save-dev cypress
   ```
2. Run the Cypress test runner:
   ```bash
   npx cypress open
   ```
   or headless:
   ```bash
   npx cypress run --spec e2e/popup-discord-exchange.cy.js
   ```

## How to Run API Performance Tests

1. Install dependencies:
   ```bash
   npm install --save-dev jest axios
   ```
2. Run the tests:
   ```bash
   npx jest e2e/api-performance.test.js
   ```

- Ensure your API server is running and API_BASE_URL is set if not using localhost:3000.
- These tests cover Discord login, popup display/dismissal, Exchange navigation, and API endpoint performance under load.
