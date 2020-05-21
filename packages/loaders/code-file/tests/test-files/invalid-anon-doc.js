import gql from 'graphql-tag';

export const invalidQuery = gql`
  InvalidGetUser {
    user("1") {
      id
    }
  }
`;
