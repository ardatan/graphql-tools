import TypeB from './circularSchemaB';
import gql from './gql';

export default () => [
  gql`
    type TypeA {
      id: ID
      b: TypeB
    }
  `,
  TypeB,
];
