# CI/CD Automation: Regression, Load, and Performance Testing

## Regression Testing
- All unit, integration, and property-based tests must run on every PR and push.
- Fail the build on any test failure.

## Load and Performance Testing
- Use tools like [k6](https://k6.io/), [Artillery](https://artillery.io/), or [Locust](https://locust.io/) to simulate real-world load.
- Run load tests against staging before every major release.

### Example: k6 Load Test Script
```js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 50,
  duration: '1m',
};

export default function () {
  const res = http.get('http://localhost:4000/api/offers');
  check(res, { 'status was 200': (r) => r.status === 200 });
  sleep(1);
}
```

## Example GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
  load-test:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - name: Install k6
        run: sudo apt-get install -y k6
      - name: Start server
        run: npm run start &
      - name: Run k6 load test
        run: k6 run ./test/load.k6.js
```

## References
- [k6 Documentation](https://k6.io/docs/)
- [Artillery](https://artillery.io/docs/)
- [Locust](https://docs.locust.io/en/stable/)
