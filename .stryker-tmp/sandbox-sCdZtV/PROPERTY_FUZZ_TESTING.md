# Property-Based and Fuzz Testing for Production-Grade Security

## Property-Based Testing (fast-check)
- Use [fast-check](https://github.com/dubzzz/fast-check) to generate randomized, property-based tests for all business logic and API endpoints.
- Ensures your code is robust against a wide range of valid and invalid inputs.

### Example (Jest + fast-check)
```js
import fc from 'fast-check';
import { parseCoinAmount } from '../src/coin-exchange';

describe('parseCoinAmount property-based', () => {
  it('should return null for non-positive or invalid numbers', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const n = Number(s);
        if (isNaN(n) || n <= 0) {
          expect(parseCoinAmount(s)).toBeNull();
        }
      })
    );
  });
  it('should round valid numbers to 2 decimals', () => {
    fc.assert(
      fc.property(fc.float({ min: 0.01, max: 1e6 }), (n) => {
        const s = n.toString();
        const result = parseCoinAmount(s);
        if (result !== null) {
          expect(result).toBeCloseTo(Math.round(n * 100) / 100, 2);
        }
      })
    );
  });
});
```

## Fuzz Testing (OWASP ZAP, Burp Suite, RESTler)
- Use API fuzzers to automatically test endpoints for injection, logic bugs, and crash conditions.
- Integrate into CI/CD for every PR and release.

### Example: ZAP CLI Fuzzing
```sh
zap-baseline.py -t http://localhost:4000/openapi.json -r zap-report.html
```

## CI/CD Integration
- Add property-based and fuzz tests to your GitHub Actions or other CI pipeline.
- Fail builds on any property/fuzz test failure.

## References
- [fast-check](https://github.com/dubzzz/fast-check)
- [OWASP ZAP](https://www.zaproxy.org/)
- [RESTler Fuzzer](https://github.com/microsoft/restler-fuzzer)
- [Burp Suite](https://portswigger.net/burp)
