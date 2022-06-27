import TypeA from './circularSchemaA.js';

const TypeB = () => [
  `
type TypeB {
  id: ID
  a: TypeA
}`,
  TypeA,
];

export default TypeB;
