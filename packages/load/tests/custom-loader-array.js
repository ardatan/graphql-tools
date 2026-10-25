const { parse } = require('graphql');

module.exports = function () {
  return [
    {
      document: parse(/* GraphQL */ `
        query Users {
          users {
            id
          }
        }
      `),
      location: 'users.graphql',
    },
    {
      document: parse(/* GraphQL */ `
        query Orders {
          orders {
            id
          }
        }
      `),
      location: 'orders.graphql',
    },
  ];
};
