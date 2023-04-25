const { stitchSchemas } = require('@graphql-tools/stitch');
const { getSubschemaForFederationWithSchema } = require('@graphql-tools/federation');

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
