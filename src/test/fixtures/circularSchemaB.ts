import TypeA from './circularSchemaA';

const TypeB = () => [
  `
type TypeB {
  id: ID
  a: TypeA
}`,
  TypeA,
];

export default TypeB;
