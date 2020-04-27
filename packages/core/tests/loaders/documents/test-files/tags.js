import gql from 'graphql-tag';
import { graphql } from 'gatsby';
import { parse } from 'parse-graphql';

export const aQuery = gql`
  query a {
    a
  }
`;

export const bQuery = graphql`
  query b {
    b
  }
`;

export const cQuery = parse`
  query c {
    c
  }
`;
