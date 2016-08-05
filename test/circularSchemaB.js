import TypeA from './circularSchemaA';

export default () => [`
type TypeB {
  id: ID
  a: TypeA
}`,
TypeA,
];
