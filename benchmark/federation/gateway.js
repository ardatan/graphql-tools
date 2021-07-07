const { ApolloGateway, LocalGraphQLDataSource } = require('@apollo/gateway');

const serviceMap = {
  accounts: require('./services/accounts'),
  inventory: require('./services/inventory'),
  products: require('./services/products'),
  reviews: require('./services/reviews'),
};

module.exports = async function () {
  const gateway = new ApolloGateway({
    localServiceList: Object.entries(serviceMap).map(([name, { typeDefs }]) => ({
      name,
      typeDefs,
    })),
    buildService: ({ name }) => new LocalGraphQLDataSource(serviceMap[name].schema)
  });

  return gateway.load();
};
