import { parse, print } from 'graphql';
import { deduplicateDocument } from '../src/deduplicateDocument';
import '../../testing/to-be-similar-gql-doc';

describe('deduplicateDocument', () => {
  it('fragment spreads with the same name are deduplicated', () => {
    const document = parse(/* GraphQL */ `
      {
        ...User
        ...User
        ...Product
      }
    `);

    expect(print(deduplicateDocument(document))).toBeSimilarGqlDoc(/* GraphQL */ `
      {
        ...User
        ...Product
      }
    `);
  });
  it('fields with the same response key are merged together with their selection sets', () => {
    const document = parse(/* GraphQL */ `
      {
        user {
          id
          username
        }
        user {
          name
        }
      }
    `);

    expect(print(deduplicateDocument(document))).toBeSimilarGqlDoc(/* GraphQL */ `
      {
        user {
          id
          username
          name
        }
      }
    `);
  });
  it('fields with the same response key are merged', () => {
    const document = parse(/* GraphQL */ `
      {
        id
        username
        id
      }
    `);

    expect(print(deduplicateDocument(document))).toBeSimilarGqlDoc(/* GraphQL */ `
      {
        id
        username
      }
    `);
  });
  it('fields in the inline fragment', () => {
    const document = parse(/* GraphQL */ `
      {
        ... on Post {
          title
          title
          id
          __typename
        }
      }
    `);

    expect(print(deduplicateDocument(document))).toBeSimilarGqlDoc(/* GraphQL */ `
      {
        ... on Post {
          title
          id
          __typename
        }
      }
    `);
  });
  it('fields in the fragment definition', () => {
    const document = parse(/* GraphQL */ `
      fragment User on User {
        id
        username
        id
      }
    `);

    expect(print(deduplicateDocument(document))).toBeSimilarGqlDoc(/* GraphQL */ `
      fragment User on User {
        id
        username
      }
    `);
  });
  it('deduplicate recursive fragment spreads', () => {
    const document = parse(/* GraphQL */ `
      fragment User on User {
        id
        name
        friends {
          ...User
        }
        name
      }
      query {
        ...User
      }
    `);

    expect(print(deduplicateDocument(document))).toBeSimilarGqlDoc(/* GraphQL */ `
      fragment User on User {
        id
        name
        friends {
          ...User
        }
      }
      query {
        ...User
      }
    `);
  });
});
