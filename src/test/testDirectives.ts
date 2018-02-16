import { assert } from 'chai';
import {
  makeExecutableSchema,
} from '../schemaGenerator';
import {
  VisitableSchemaType,
  SchemaDirectiveVisitor,
  SchemaVisitor,
  visitSchema,
} from '../schemaVisitor';
import {
  GraphQLArgument,
  GraphQLEnumType,
  GraphQLEnumValue,
  GraphQLField,
  GraphQLInputField,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLSchema,
} from 'graphql';

const typeDefs = `
directive @schemaDirective(role: String) on SCHEMA
directive @enumValueDirective on ENUM_VALUE

schema @schemaDirective(role: "admin") {
  query: Query
  mutation: Mutation
}

type Query @queryTypeDirective {
  people: [Person] @queryFieldDirective
}

enum Gender @enumTypeDirective {
  NONBINARY @enumValueDirective
  FEMALE
  MALE
}

scalar Date @dateDirective(tz: "utc")

interface Named @interfaceDirective {
  name: String! @interfaceFieldDirective
}

input PersonInput @inputTypeDirective {
  name: String! @inputFieldDirective
  gender: Gender
}

type Mutation @mutationTypeDirective {
  addPerson(
    input: PersonInput @mutationArgumentDirective
  ): Person @mutationMethodDirective
}

type Person implements Named @objectTypeDirective {
  id: ID! @objectFieldDirective
  name: String!
}

union WhateverUnion @unionDirective = Person | Query | Mutation
`;

describe('@directives', () => {
  it('are included in the schema AST', () => {
    const schema = makeExecutableSchema({
      typeDefs,
    });

    function checkDirectives(
      type: VisitableSchemaType,
      typeDirectiveNames: [string],
      fieldDirectiveMap: { [key: string]: string[] } = {},
    ) {
      assert.deepEqual(
        getDirectiveNames(type),
        typeDirectiveNames,
      );

      Object.keys(fieldDirectiveMap).forEach(key => {
        assert.deepEqual(
          getDirectiveNames((type as GraphQLObjectType).getFields()[key]),
          fieldDirectiveMap[key],
        );
      });
    }

    function getDirectiveNames(
      type: VisitableSchemaType,
    ): string[] {
      return type.astNode.directives.map(d => d.name.value);
    }

    assert.deepEqual(
      getDirectiveNames(schema),
      ['schemaDirective'],
    );

    checkDirectives(schema.getQueryType(), ['queryTypeDirective'], {
      people: ['queryFieldDirective'],
    });

    assert.deepEqual(
      getDirectiveNames(schema.getType('Gender')),
      ['enumTypeDirective'],
    );

    const nonBinary = (schema.getType('Gender') as GraphQLEnumType).getValues()[0];
    assert.deepEqual(
      getDirectiveNames(nonBinary),
      ['enumValueDirective'],
    );

    checkDirectives(schema.getType('Date'), ['dateDirective']);

    checkDirectives(schema.getType('Named'), ['interfaceDirective'], {
      name: ['interfaceFieldDirective'],
    });

    checkDirectives(schema.getType('PersonInput'), ['inputTypeDirective'], {
      name: ['inputFieldDirective'],
      gender: [],
    });

    checkDirectives(schema.getMutationType(), ['mutationTypeDirective'], {
      addPerson: ['mutationMethodDirective'],
    });
    assert.deepEqual(
      getDirectiveNames(schema.getMutationType().getFields().addPerson.args[0]),
      ['mutationArgumentDirective'],
    );

    checkDirectives(schema.getType('Person'), ['objectTypeDirective'], {
      id: ['objectFieldDirective'],
      name: [],
    });

    checkDirectives(schema.getType('WhateverUnion'), ['unionDirective']);
  });

  it('can be implemented with SchemaDirectiveVisitor', () => {
    const visited: Set<GraphQLObjectType> = new Set;
    const schema = makeExecutableSchema({ typeDefs });
    let visitCount = 0;

    SchemaDirectiveVisitor.visitSchemaDirectives(schema, {
      // The directive subclass can be defined anonymously inline!
      queryTypeDirective: class extends SchemaDirectiveVisitor {
        public static description = 'A @directive for query object types';
        public visitObject(object: GraphQLObjectType) {
          visited.add(object);
          visitCount++;
        }
      },
    });

    assert.strictEqual(visited.size, 1);
    assert.strictEqual(visitCount, 1);
    visited.forEach(object => {
      assert.strictEqual(object, schema.getType('Query'));
    });
  });

  it('can visit the schema itself', () => {
    const visited: GraphQLSchema[] = [];
    const schema = makeExecutableSchema({ typeDefs });
    SchemaDirectiveVisitor.visitSchemaDirectives(schema, {
      schemaDirective: class extends SchemaDirectiveVisitor {
        public visitSchema(s: GraphQLSchema) {
          visited.push(s);
        }
      }
    });
    assert.strictEqual(visited.length, 1);
    assert.strictEqual(visited[0], schema);
  });

  it('can visit fields within object types', () => {
    const schema = makeExecutableSchema({ typeDefs });

    let mutationObjectType: GraphQLObjectType;
    let mutationField: GraphQLField<any, any>;
    let enumObjectType: GraphQLEnumType;
    let inputObjectType: GraphQLInputObjectType;

    SchemaDirectiveVisitor.visitSchemaDirectives(schema, {
      mutationTypeDirective: class extends SchemaDirectiveVisitor {
        public visitObject(object: GraphQLObjectType) {
          mutationObjectType = object;
          assert.strictEqual(this.visitedType, object);
          assert.strictEqual(object.name, 'Mutation');
        }
      },

      mutationMethodDirective: class extends SchemaDirectiveVisitor {
        public visitFieldDefinition(field: GraphQLField<any, any>, details: {
          objectType: GraphQLObjectType,
        }) {
          assert.strictEqual(this.visitedType, field);
          assert.strictEqual(field.name, 'addPerson');
          assert.strictEqual(details.objectType, mutationObjectType);
          assert.strictEqual(field.args.length, 1);
          mutationField = field;
        }
      },

      mutationArgumentDirective: class extends SchemaDirectiveVisitor {
        public visitArgumentDefinition(arg: GraphQLArgument, details: {
          field: GraphQLField<any, any>,
          objectType: GraphQLObjectType,
        }) {
          assert.strictEqual(this.visitedType, arg);
          assert.strictEqual(arg.name, 'input');
          assert.strictEqual(details.field, mutationField);
          assert.strictEqual(details.objectType, mutationObjectType);
          assert.strictEqual(details.field.args[0], arg);
        }
      },

      enumTypeDirective: class extends SchemaDirectiveVisitor {
        public visitEnum(enumType: GraphQLEnumType) {
          assert.strictEqual(this.visitedType, enumType);
          assert.strictEqual(enumType.name, 'Gender');
          enumObjectType = enumType;
        }
      },

      enumValueDirective: class extends SchemaDirectiveVisitor {
        public visitEnumValue(value: GraphQLEnumValue, details: {
          enumType: GraphQLEnumType,
        }) {
          assert.strictEqual(this.visitedType, value);
          assert.strictEqual(value.name, 'NONBINARY');
          assert.strictEqual(value.value, 'NONBINARY');
          assert.strictEqual(details.enumType, enumObjectType);
        }
      },

      inputTypeDirective: class extends SchemaDirectiveVisitor {
        public visitInputObject(object: GraphQLInputObjectType) {
          inputObjectType = object;
          assert.strictEqual(this.visitedType, object);
          assert.strictEqual(object.name, 'PersonInput');
        }
      },

      inputFieldDirective: class extends SchemaDirectiveVisitor {
        public visitInputFieldDefinition(field: GraphQLInputField, details: {
          objectType: GraphQLInputObjectType,
        }) {
          assert.strictEqual(this.visitedType, field);
          assert.strictEqual(field.name, 'name');
          assert.strictEqual(details.objectType, inputObjectType);
        }
      }
    });
  });

  it('can check if a visitor method is implemented', () => {
    class Visitor extends SchemaVisitor {
      public notVisitorMethod() {
        return false;
      }

      public visitObject() {
        return true;
      }
    }

    const visitor = new Visitor;

    assert.strictEqual(
      Visitor.implementsVisitorMethod('notVisitorMethod'),
      visitor.notVisitorMethod(),
    );

    assert.strictEqual(
      Visitor.implementsVisitorMethod('visitObject'),
      visitor.visitObject(),
    );

    assert.strictEqual(
      Visitor.implementsVisitorMethod('visitInputFieldDefinition'),
      false,
    );

    assert.strictEqual(
      Visitor.implementsVisitorMethod('visitBogusType'),
      false,
    );
  });

  it('can use visitSchema for simple visitor patterns', () => {
    class SimpleVisitor extends SchemaVisitor {
      public visitCount = 0;
      public names: string[] = [];

      constructor(s: GraphQLSchema) {
        super();
        this.schema = s;
      }

      public visit() {
        // More complicated visitor implementations might use the
        // visitorSelector function more selectively, but this SimpleVisitor
        // class always volunteers itself to visit any schema type.
        visitSchema(this.schema, () => [this]);
      }

      public visitObject(object: GraphQLObjectType) {
        assert.strictEqual(this.schema.getType(object.name), object);
        this.names.push(object.name);
      }
    }

    const schema = makeExecutableSchema({ typeDefs });
    const visitor = new SimpleVisitor(schema);
    visitor.visit();
    assert.deepEqual(visitor.names.sort(), [
      'Mutation',
      'Person',
      'Query',
    ]);
  });

  it('can use SchemaDirectiveVisitor as a no-op visitor', () => {
    const schema = makeExecutableSchema({ typeDefs });
    const methodNamesEncountered = Object.create(null);

    class EnthusiasticVisitor extends SchemaDirectiveVisitor {
      public static implementsVisitorMethod(name: string) {
        // Pretend this class implements all visitor methods. This is safe
        // because the SchemaVisitor base class provides empty stubs for all
        // the visitor methods that might be called.
        return methodNamesEncountered[name] = true;
      }
    }

    EnthusiasticVisitor.visitSchemaDirectives(schema, {
      schemaDirective: EnthusiasticVisitor,
      queryTypeDirective: EnthusiasticVisitor,
      queryFieldDirective: EnthusiasticVisitor,
      enumTypeDirective: EnthusiasticVisitor,
      enumValueDirective: EnthusiasticVisitor,
      dateDirective: EnthusiasticVisitor,
      interfaceDirective: EnthusiasticVisitor,
      interfaceFieldDirective: EnthusiasticVisitor,
      inputTypeDirective: EnthusiasticVisitor,
      inputFieldDirective: EnthusiasticVisitor,
      mutationTypeDirective: EnthusiasticVisitor,
      mutationArgumentDirective: EnthusiasticVisitor,
      mutationMethodDirective: EnthusiasticVisitor,
      objectTypeDirective: EnthusiasticVisitor,
      objectFieldDirective: EnthusiasticVisitor,
      unionDirective: EnthusiasticVisitor,
    });

    assert.deepEqual(
      Object.keys(methodNamesEncountered).sort(),
      Object.keys(SchemaVisitor.prototype)
            .filter(name => name.startsWith('visit'))
            .sort()
    );
  });

  it('can handle all kinds of undeclared arguments', () => {
    const schemaText = `
    enum SpineEnum {
      VERTEBRATE @directive(spineless: false)
      INVERTEBRATE @directive(spineless: true)
    }

    type Query @directive(c: null, d: 1, e: { oyez: 3.1415926 }) {
      animal(
        name: String @directive(f: ["n", "a", "m", "e"])
      ): Animal @directive(g: INVERTEBRATE)
    }

    type Animal {
      name: String @directive(default: "horse")
      spine: SpineEnum @directive(default: VERTEBRATE)
    }
    `;

    let enumValueCount = 0;
    let objectCount = 0;
    let argumentCount = 0;
    let fieldCount = 0;

    const directiveVisitors = {
      directive: class extends SchemaDirectiveVisitor {
        public visitEnumValue(value: GraphQLEnumValue) {
          ++enumValueCount;
          assert.strictEqual(
            this.args.spineless,
            value.name === 'INVERTEBRATE'
          );
        }

        public visitObject(object: GraphQLObjectType) {
          ++objectCount;
          assert.strictEqual(this.args.c, null);
          assert.strictEqual(this.args.d, 1);
          assert.strictEqual(Math.round(this.args.e.oyez), 3);
        }

        public visitArgumentDefinition(arg: GraphQLArgument) {
          ++argumentCount;
          assert.strictEqual(this.args.f.join(''), 'name');
        }

        public visitFieldDefinition(field: GraphQLField<any, any>, details: {
          objectType: GraphQLObjectType,
        }) {
          ++fieldCount;
          switch (details.objectType.name) {
          case 'Query':
            assert.strictEqual(this.args.g, 'INVERTEBRATE');
            break;
          case 'Animal':
            if (field.name === 'name') {
              assert.strictEqual(this.args.default, 'horse');
            } else if (field.name === 'spine') {
              assert.strictEqual(this.args.default, 'VERTEBRATE');
            }
            break;
          default:
            throw new Error('unexpected field parent object type');
          }
        }
      }
    };

    makeExecutableSchema({
      typeDefs: schemaText,
      directiveVisitors,
    });

    assert.strictEqual(enumValueCount, 2);
    assert.strictEqual(objectCount, 1);
    assert.strictEqual(argumentCount, 1);
    assert.strictEqual(fieldCount, 3);
  });

  it('can also handle declared arguments', () => {
    const schemaText = `
    directive @oyez(times: Int = 3) on OBJECT | FIELD_DEFINITION

    schema {
      query: Courtroom
    }

    type Courtroom @oyez {
      judge: String @oyez(times: 0)
      marshall: String @oyez
      lawyers(
        # Should @oyez be disallowed here, since it wasn't declared with
        # the ARGUMENT_DEFINITION location, or simply ignored?
        party: Party @oyez(times: 0)
      ): [String]
    }

    enum Party {
      DEFENSE
      PROSECUTION
    }`;

    const schema = makeExecutableSchema({ typeDefs: schemaText });
    const context = {
      objectCount: 0,
      fieldCount: 0,
    };

    const visitors = SchemaDirectiveVisitor.visitSchemaDirectives(schema, {
      oyez: class extends SchemaDirectiveVisitor {
        public visitObject(object: GraphQLObjectType) {
          ++this.context.objectCount;
          assert.strictEqual(this.args.times, 3);
        }

        public visitFieldDefinition(field: GraphQLField<any, any>) {
          ++this.context.fieldCount;
          if (field.name === 'judge') {
            assert.strictEqual(this.args.times, 0);
          } else if (field.name === 'marshall') {
            assert.strictEqual(this.args.times, 3);
          }
        }
      }
    }, context);

    assert.strictEqual(context.objectCount, 1);
    assert.strictEqual(context.fieldCount, 2);

    assert.deepEqual(Object.keys(visitors), ['oyez']);
    assert.deepEqual(
      visitors.oyez.map(v => {
        return (v.visitedType as GraphQLObjectType | GraphQLField<any, any>).name;
      }),
      ['Courtroom', 'judge', 'marshall'],
    );
  });
});
