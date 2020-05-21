import { graphql } from 'gatsby';

export const typeDefs = graphql`
  extend type User {
    b: String
  }
`;
