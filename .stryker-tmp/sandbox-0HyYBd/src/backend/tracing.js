// @ts-nocheck
// OpenTelemetry tracing setup for Fastify
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const instrumentations = [getNodeAutoInstrumentations()];
const sdk = new NodeSDK({
  instrumentations,
});

sdk.start();

// Export for testing
module.exports = { sdk, instrumentations };
