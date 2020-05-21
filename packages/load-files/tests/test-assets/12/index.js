const gql = require('graphql-tag');

const IndexType = gql`
  type IndexType {
    f: Int
  }
`;

module.exports = {
  IndexType: {
    f: '12',
  },
};
