const gql = require('graphql-tag');

module.exports = {
  default: gql`
    type MyType {
      f: String
    }
  `,
};
