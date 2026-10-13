import { gql } from 'graphql-tag';

export const SHARED_USER_FRAGMENT = gql`
  fragment SharedUserFragment on User {
    id
    name
    email
  }
`;
