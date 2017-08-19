import TypeA from './circularSchemaA';
import gql from './gql';
export default () => [
  gql`
    type TypeB {
      id: ID
      a: TypeA
    }
  `,
  TypeA,
];
