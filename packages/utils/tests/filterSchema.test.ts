import { makeExecutableSchema } from '@graphql-tools/schema';
import { filterSchema } from '@graphql-tools/utils';

describe('filterSchema', () => {
  it('filters root fields', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type Query {
          keep: String
          omit: String
        }
        type Mutation {
          keepThis(id: ID): String
          omitThis(id: ID): String
        }
      `
    });

    const filtered = filterSchema({
      schema,
      rootFieldFilter: (opName, fieldName) => fieldName.startsWith('keep'),
    });

    expect(filtered.getType('Query').getFields()['keep']).toBeDefined();
    expect(filtered.getType('Query').getFields()['omit']).toBeUndefined();
    expect(filtered.getType('Mutation').getFields()['keepThis']).toBeDefined();
    expect(filtered.getType('Mutation').getFields()['omitThis']).toBeUndefined();
  });

  it('filters types', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type Keep implements IKeep {
          field(input: KeepInput): String
        }
        interface IKeep {
          field(input: KeepInput): String
        }
        type Remove implements IRemove {
          field(input: RemoveInput): String
        }
        interface IRemove {
          field(input: RemoveInput): String
        }
        union KeepMany = Keep | Remove
        union RemoveMany = Keep | Remove
        input KeepInput {
          field: String
        }
        input RemoveInput {
          field: String
        }
        enum KeepValues {
          VALUE
        }
        enum RemoveValues {
          VALUE
        }
        scalar KeepScalar
        scalar RemoveScalar
      `
    });

    const filtered = filterSchema({
      schema,
      typeFilter: (typeName) => !/^I?Remove/.test(typeName)
    });

    expect(filtered.getType('Keep')).toBeDefined();
    expect(filtered.getType('IKeep')).toBeDefined();
    expect(filtered.getType('KeepMany')).toBeDefined();
    expect(filtered.getType('KeepInput')).toBeDefined();
    expect(filtered.getType('KeepValues')).toBeDefined();
    expect(filtered.getType('KeepScalar')).toBeDefined();

    expect(filtered.getType('Remove')).toBeUndefined();
    expect(filtered.getType('IRemove')).toBeUndefined();
    expect(filtered.getType('RemoveMany')).toBeUndefined();
    expect(filtered.getType('RemoveInput')).toBeUndefined();
    expect(filtered.getType('RemoveValues')).toBeUndefined();
    expect(filtered.getType('RemoveScalar')).toBeUndefined();
  });

  it('filters object fields', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type Thing implements IThing {
          keep: String
          omit: String
        }
        interface IThing {
          control: String
        }
      `
    });

    const filtered = filterSchema({
      schema,
      objectFieldFilter: (typeName, fieldName) => fieldName.startsWith('keep'),
    });

    expect(filtered.getType('Thing').getFields()['keep']).toBeDefined();
    expect(filtered.getType('Thing').getFields()['omit']).toBeUndefined();
    expect(filtered.getType('IThing').getFields()['control']).toBeDefined();
  });

  it('filters interface fields', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        interface IThing {
          keep: String
          omit: String
        }
        type Thing implements IThing {
          control: String
        }
      `
    });

    const filtered = filterSchema({
      schema,
      interfaceFieldFilter: (typeName, fieldName) => fieldName.startsWith('keep'),
    });

    expect(filtered.getType('IThing').getFields()['keep']).toBeDefined();
    expect(filtered.getType('IThing').getFields()['omit']).toBeUndefined();
    expect(filtered.getType('Thing').getFields()['control']).toBeDefined();
  });

  it('filters input object fields', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        input ThingInput {
          keep: String
          omit: String
        }
        type Thing {
          control: String
        }
      `
    });

    const filtered = filterSchema({
      schema,
      inputObjectFieldFilter: (typeName, fieldName) => fieldName.startsWith('keep'),
    });

    expect(filtered.getType('ThingInput').getFields()['keep']).toBeDefined();
    expect(filtered.getType('ThingInput').getFields()['omit']).toBeUndefined();
    expect(filtered.getType('Thing').getFields()['control']).toBeDefined();
  });

  it('filters all field types', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type Thing implements IThing {
          keep: String
          omit: String
        }
        interface IThing {
          keep: String
          omit: String
        }
        input ThingInput {
          keep: String
          omit: String
        }
      `
    });

    const filtered = filterSchema({
      schema,
      fieldFilter: (typeName, fieldName) => fieldName.startsWith('keep'),
    });

    expect(filtered.getType('Thing').getFields()['keep']).toBeDefined();
    expect(filtered.getType('Thing').getFields()['omit']).toBeUndefined();
    expect(filtered.getType('IThing').getFields()['keep']).toBeDefined();
    expect(filtered.getType('IThing').getFields()['omit']).toBeUndefined();
    expect(filtered.getType('ThingInput').getFields()['keep']).toBeDefined();
    expect(filtered.getType('ThingInput').getFields()['omit']).toBeUndefined();
  });

  it('filters all arguments', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type Thing implements IThing {
          field(keep: String, omit: String): String
        }
        interface IThing {
          field(keep: String, omit: String): String
        }
      `
    });

    const filtered = filterSchema({
      schema,
      argumentFilter: (typeName, fieldName, argName) => argName.startsWith('keep'),
    });

    expect(filtered.getType('Thing').getFields()['field'].args.map(arg => arg.name)).toEqual(['keep']);
    expect(filtered.getType('IThing').getFields()['field'].args.map(arg => arg.name)).toEqual(['keep']);
  });
});
