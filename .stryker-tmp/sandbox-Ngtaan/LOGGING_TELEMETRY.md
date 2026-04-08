# Hands-On: Structured Logging & OpenTelemetry Tracing

## Structured Logging (Fastify + pino)
- Fastify uses [pino](https://getpino.io/) for high-performance, structured JSON logging by default.
- All logs are output as JSON, ready for ingestion by log management systems (ELK, Datadog, etc).

### Example: Custom Log Fields
```js
const fastify = Fastify({
  logger: {
    level: 'info',
    serializers: {
      req (request) {
        return {
          method: request.method,
          url: request.url,
          id: request.id,
          remoteAddress: request.ip,
        };
      }
    }
  }
});
```

## OpenTelemetry Tracing
- Add [@opentelemetry/api](https://www.npmjs.com/package/@opentelemetry/api) and [@opentelemetry/sdk-node](https://www.npmjs.com/package/@opentelemetry/sdk-node) to your project.
- Use [@opentelemetry/instrumentation-fastify](https://www.npmjs.com/package/@opentelemetry/instrumentation-fastify) for automatic Fastify tracing.

### Example: Basic OpenTelemetry Setup
```js
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

- Import `tracing.js` at the top of your server entrypoint (before Fastify is created):
```js
require('./tracing');
```

- Export traces to Jaeger, Zipkin, or your cloud provider for full observability.

## References
- [Fastify Logging](https://www.fastify.io/docs/latest/Reference/Logging/)
- [OpenTelemetry Node.js](https://opentelemetry.io/docs/instrumentation/js/)
- [OpenTelemetry Fastify](https://www.npmjs.com/package/@opentelemetry/instrumentation-fastify)
