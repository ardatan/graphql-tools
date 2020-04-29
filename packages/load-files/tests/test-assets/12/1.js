const gql = require('graphql-tag');

const MyType = gql`
  type MyType {
    f: String
  }
`;

module.exports = {
  MyType: {
    f: '12',
  },
};
