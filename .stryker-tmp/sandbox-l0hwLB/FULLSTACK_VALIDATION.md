# Fullstack Type-Safe API Validation & End-to-End Testing

## Type-Safe API Validation
- Use [OpenAPI](https://swagger.io/specification/) or [zod](https://github.com/colinhacks/zod) for schema validation of all API requests and responses.
- Generate TypeScript types from your OpenAPI spec for end-to-end type safety.
- Validate all incoming and outgoing data at the API boundary.

### Example: zod Validation
```ts
import { z } from 'zod';

const OfferSchema = z.object({
  userId: z.string(),
  btcAmount: z.number().positive(),
  usdAmount: z.number().positive(),
});

function validateOffer(input: any) {
  return OfferSchema.parse(input);
}
```

## End-to-End (E2E) Testing
- Use [Cypress](https://www.cypress.io/) or [Playwright](https://playwright.dev/) for automated browser-based E2E tests.
- Cover all critical user flows, including authentication, offer creation, trade acceptance, and error handling.

### Example: Cypress Test
```js
describe('Offer Creation', () => {
  it('should create an offer', () => {
    cy.visit('/');
    cy.get('input[name="userId"]').type('user123');
    cy.get('input[name="btcAmount"]').type('0.5');
    cy.get('input[name="usdAmount"]').type('25000');
    cy.get('button[type="submit"]').click();
    cy.contains('Offer created').should('be.visible');
  });
});
```

## CI Integration
- Run E2E tests in CI on every PR and before every release.
- Fail builds on any E2E test failure.

## References
- [OpenAPI](https://swagger.io/specification/)
- [zod](https://github.com/colinhacks/zod)
- [Cypress](https://docs.cypress.io/)
- [Playwright](https://playwright.dev/docs/intro)
