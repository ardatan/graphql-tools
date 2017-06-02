import TypeB from './circularSchemaB';
export default () => [`
type TypeA {
  id: ID
  b: TypeB
}`,
    TypeB,
];
//# sourceMappingURL=circularSchemaA.js.map