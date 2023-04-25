const { stitchSchemas } = require('@graphql-tools/stitch');
const { federationSubschemaTransformer } = require('@graphql-tools/federation');
const { buildSchema } = require('graphql');
const { createDefaultExecutor } = require('@graphql-tools/delegate');

const services = [
  require('./services/accounts'),
  require('./services/inventory'),
  require('./services/products'),
  require('./services/reviews'),
];

async function makeGatewaySchema() {
  return stitchSchemas({
    subschemas: services.map(service => ({
      schema: buildSchema(service.typeDefs, {
        assumeValid: true,
        assumeValidSDL: true,
      }),
      executor: createDefaultExecutor(service.schema),
    })),
    subschemaConfigTransforms: [federationSubschemaTransformer],
  });
}

module.exports = makeGatewaySchema;
