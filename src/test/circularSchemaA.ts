import TypeB from './circularSchemaB';

const TypeA = () => [
  `
type TypeA {
  id: ID
  b: TypeB
}`,
  TypeB,
];

export default TypeA;
