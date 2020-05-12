import {
  GraphQLObjectType,
  GraphQLSchema,
  printSchema,
} from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';
import {
  SchemaTransform,
  mapSchema,
  MapperKind,
  getDirectives,
} from '@graphql-tools/utils';

const typeDefs = `
directive @schemaDirective(role: String) on SCHEMA
directive @schemaExtensionDirective(role: String) on SCHEMA
directive @queryTypeDirective on OBJECT
directive @queryTypeExtensionDirective on OBJECT
directive @queryFieldDirective on FIELD_DEFINITION
directive @enumTypeDirective on ENUM
directive @enumTypeExtensionDirective on ENUM
directive @enumValueDirective on ENUM_VALUE
directive @dateDirective(tz: String) on SCALAR
directive @dateExtensionDirective(tz: String) on SCALAR
directive @interfaceDirective on INTERFACE
directive @interfaceExtensionDirective on INTERFACE
directive @interfaceFieldDirective on FIELD_DEFINITION
directive @inputTypeDirective on INPUT_OBJECT
directive @inputTypeExtensionDirective on INPUT_OBJECT
directive @inputFieldDirective on INPUT_FIELD_DEFINITION
directive @mutationTypeDirective on OBJECT
directive @mutationTypeExtensionDirective on OBJECT
directive @mutationArgumentDirective on ARGUMENT_DEFINITION
directive @mutationMethodDirective on FIELD_DEFINITION
directive @objectTypeDirective on OBJECT
directive @objectTypeExtensionDirective on OBJECT
directive @objectFieldDirective on FIELD_DEFINITION
directive @unionDirective on UNION
directive @unionExtensionDirective on UNION

schema @schemaDirective(role: "admin") {
  query: Query
  mutation: Mutation
}

extend schema @schemaExtensionDirective(role: "admin")

type Query @queryTypeDirective {
  people: [Person] @queryFieldDirective
}

extend type Query @queryTypeExtensionDirective

enum Gender @enumTypeDirective {
  NONBINARY @enumValueDirective
  FEMALE
  MALE
}

extend enum Gender @enumTypeExtensionDirective
scalar Date @dateDirective(tz: "utc")

extend scalar Date @dateExtensionDirective(tz: "utc")
interface Named @interfaceDirective {
  name: String! @interfaceFieldDirective
}

extend interface Named @interfaceExtensionDirective
input PersonInput @inputTypeDirective {
  name: String! @inputFieldDirective
  gender: Gender
}

extend input PersonInput @inputTypeExtensionDirective
type Mutation @mutationTypeDirective {
  addPerson(
    input: PersonInput @mutationArgumentDirective
  ): Person @mutationMethodDirective
}

extend type Mutation @mutationTypeExtensionDirective
type Person implements Named @objectTypeDirective {
  id: ID! @objectFieldDirective
  name: String!
}

extend type Person @objectTypeExtensionDirective
union WhateverUnion @unionDirective = Person | Query | Mutation

extend union WhateverUnion @unionExtensionDirective`;

describe('@directives', () => {
  test('can be iterated with mapSchema', () => {
    const visited: Set<GraphQLObjectType> = new Set();

    function addTypeToSetDirective(directiveNames: Array<string>): SchemaTransform {
      return schema => mapSchema(schema, {
        [MapperKind.OBJECT_TYPE]: type => {
          const directives = getDirectives(schema, type);
          Object.keys(directives).forEach(directiveName => {
            if (directiveNames.includes(directiveName)) {
              expect(type.name).toBe(schema.getQueryType().name);
              visited.add(type);
            }
          });
          return undefined;
        }
      })
    }

    makeExecutableSchema({
      typeDefs,
      schemaTransforms: [
        addTypeToSetDirective(['queryTypeDirective', 'queryTypeExtensionDirective'])
      ]
    });

    expect(visited.size).toBe(1);
  });

  test('can visit the schema directly', () => {
    const visited: Array<GraphQLSchema> = [];

    function recordDirectiveUses(directiveNames: Array<string>): SchemaTransform {
      return schema => {
        const directives = getDirectives(schema, schema);
        Object.keys(directives).forEach(directiveName => {
          if (directiveNames.includes(directiveName)) {
            visited.push(schema);
          }
        });
        return schema;
      }
    }

    const schema = makeExecutableSchema({
      typeDefs,
      schemaTransforms: [
        recordDirectiveUses(['schemaDirective', 'schemaExtensionDirective'])
      ]
    });

    const printedSchema = printSchema(makeExecutableSchema({ typeDefs }));
    expect(printSchema(schema)).toEqual(printedSchema);

    expect(visited.length).toBe(2);
    expect(printSchema(visited[0])).toEqual(printedSchema);
    expect(printSchema(visited[1])).toEqual(printedSchema);
  });
});
