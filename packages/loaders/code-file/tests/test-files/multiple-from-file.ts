//@ts-ignore
import { gql } from '@app/gql';

const FooQuery = gql(/* GraphQL */ `
  query Foo {
    Tweets {
      id
    }
  }
`);

const LelFragment = gql(/* GraphQL */ `
  fragment Lel on Tweet {
    id
    body
  }
`);

const BarQuery = gql(/* GraphQL */ `
  query Bar {
    Tweets {
      ...Lel
    }
  }
`);
