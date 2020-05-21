import gql from 'graphql-tag';

export const validQuery = gql`
  query getUser {
    user(id: "1") {
      id
    }
  }
`;
