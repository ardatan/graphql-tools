import TypeB from './circularSchemaB.js';

const TypeA = () => [
  `
type TypeA {
  id: ID
  b: TypeB
}`,
  TypeB,
];

export default TypeA;
