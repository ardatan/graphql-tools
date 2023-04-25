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
    subschemas: await Promise.all(services.map(service => getSubschemaForFederationWithSchema(service.schema))),
  });
}

module.exports = makeGatewaySchema;
