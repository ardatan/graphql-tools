import { createHash } from 'crypto';

import {
  GraphQLArgument,
  GraphQLEnumType,
  GraphQLEnumValue,
  GraphQLField,
  GraphQLID,
  GraphQLInputField,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  StringValueNode,
  defaultFieldResolver,
  graphql,
  GraphQLNonNull,
  GraphQLList,
  GraphQLUnionType,
  GraphQLInt,
  GraphQLOutputType,
  isNonNullType,
  isScalarType,
  isListType,
  TypeSystemExtensionNode,
} from 'graphql';
import formatDate from 'dateformat';

import { makeExecutableSchema } from '@graphql-tools/schema';
import {
  VisitableSchemaType,
  SchemaDirectiveVisitor,
  SchemaVisitor,
  visitSchema,
  ExecutionResult,
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
  test('are included in the schema AST', () => {
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Gender: {
          NONBINARY: 'NB',
          FEMALE: 'F',
          MALE: 'M',
        },
      },
    });

    function checkDirectives(
      type: VisitableSchemaType,
      typeDirectiveNames: Array<string>,
      fieldDirectiveMap: Record<string, Array<string>> = {},
    ) {
      expect(getDirectiveNames(type)).toEqual(typeDirectiveNames);

      Object.keys(fieldDirectiveMap).forEach((key) => {
        expect(
          getDirectiveNames((type as GraphQLObjectType).getFields()[key]),
        ).toEqual(fieldDirectiveMap[key]);
      });
    }

    function getDirectiveNames(type: VisitableSchemaType): Array<string> {
      let directives = type.astNode.directives.map((d) => d.name.value);
      const extensionASTNodes = (type as {
        extensionASTNodes?: Array<TypeSystemExtensionNode>;
      }).extensionASTNodes;
      if (extensionASTNodes != null) {
        extensionASTNodes.forEach((extensionASTNode) => {
          directives = directives.concat(
            extensionASTNode.directives.map((d) => d.name.value),
          );
        });
      }
      return directives;
    }

    expect(getDirectiveNames(schema)).toEqual([
      'schemaDirective',
      'schemaExtensionDirective',
    ]);

    checkDirectives(
      schema.getQueryType(),
      ['queryTypeDirective', 'queryTypeExtensionDirective'],
      {
        people: ['queryFieldDirective'],
      },
    );

    expect(getDirectiveNames(schema.getType('Gender'))).toEqual([
      'enumTypeDirective',
      'enumTypeExtensionDirective',
    ]);

    const nonBinary = (schema.getType(
      'Gender',
    ) as GraphQLEnumType).getValues()[0];
    expect(getDirectiveNames(nonBinary)).toEqual(['enumValueDirective']);

    checkDirectives(schema.getType('Date') as GraphQLObjectType, [
      'dateDirective',
      'dateExtensionDirective',
    ]);

    checkDirectives(
      schema.getType('Named') as GraphQLObjectType,
      ['interfaceDirective', 'interfaceExtensionDirective'],
      {
        name: ['interfaceFieldDirective'],
      },
    );

    checkDirectives(
      schema.getType('PersonInput') as GraphQLObjectType,
      ['inputTypeDirective', 'inputTypeExtensionDirective'],
      {
        name: ['inputFieldDirective'],
        gender: [],
      },
    );

    checkDirectives(
      schema.getMutationType(),
      ['mutationTypeDirective', 'mutationTypeExtensionDirective'],
      {
        addPerson: ['mutationMethodDirective'],
      },
    );
    expect(
      getDirectiveNames(schema.getMutationType().getFields().addPerson.args[0]),
    ).toEqual(['mutationArgumentDirective']);

    checkDirectives(
      schema.getType('Person'),
      ['objectTypeDirective', 'objectTypeExtensionDirective'],
      {
        id: ['objectFieldDirective'],
        name: [],
      },
    );

    checkDirectives(schema.getType('WhateverUnion'), [
      'unionDirective',
      'unionExtensionDirective',
    ]);
  });

  test('works with enum and its resolvers', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        enum DateFormat {
            LOCAL
            ISO
        }

        directive @date(format: DateFormat) on FIELD_DEFINITION

        scalar Date

        type Query {
          today: Date @date(format: LOCAL)
        }
      `,
      resolvers: {
        DateFormat: {
          LOCAL: 'local',
          ISO: 'iso',
        },
      },
    });

    expect(schema.getType('DateFormat')).toBeDefined();
    expect(schema.getDirective('date')).toBeDefined();
  });

  test('can be implemented with SchemaDirectiveVisitor', () => {
    const visited: Set<GraphQLObjectType> = new Set();
    const schema = makeExecutableSchema({ typeDefs });

    SchemaDirectiveVisitor.visitSchemaDirectives(schema, {
      // The directive subclass can be defined anonymously inline!
      queryTypeDirective: class extends SchemaDirectiveVisitor {
        public static description = 'A @directive for query object types';
        public visitObject(object: GraphQLObjectType) {
          expect(object).toBe(schema.getQueryType());
          visited.add(object);
        }
      },
      queryTypeExtensionDirective: class extends SchemaDirectiveVisitor {
        public static description = 'A @directive for query object types';
        public visitObject(object: GraphQLObjectType) {
          expect(object).toBe(schema.getQueryType());
          visited.add(object);
        }
      },
    });

    expect(visited.size).toBe(1);
  });

  test('can visit the schema itself', () => {
    const visited: Array<GraphQLSchema> = [];
    const schema = makeExecutableSchema({ typeDefs });
    SchemaDirectiveVisitor.visitSchemaDirectives(schema, {
      schemaDirective: class extends SchemaDirectiveVisitor {
        public visitSchema(s: GraphQLSchema) {
          visited.push(s);
        }
      },
      schemaExtensionDirective: class extends SchemaDirectiveVisitor {
        public visitSchema(s: GraphQLSchema) {
          visited.push(s);
        }
      },
    });
    expect(visited.length).toBe(2);
    expect(visited[0]).toBe(schema);
    expect(visited[1]).toBe(schema);
  });

  test('can visit fields within object types', () => {
    const schema = makeExecutableSchema({ typeDefs });

    let mutationObjectType: GraphQLObjectType;
    let mutationField: GraphQLField<any, any>;
    let enumObjectType: GraphQLEnumType;
    let inputObjectType: GraphQLInputObjectType;

    SchemaDirectiveVisitor.visitSchemaDirectives(schema, {
      mutationTypeDirective: class extends SchemaDirectiveVisitor {
        public visitObject(object: GraphQLObjectType) {
          mutationObjectType = object;
          expect(this.visitedType).toBe(object);
          expect(object.name).toBe('Mutation');
        }
      },

      mutationTypeExtensionDirective: class extends SchemaDirectiveVisitor {
        public visitObject(object: GraphQLObjectType) {
          mutationObjectType = object;
          expect(this.visitedType).toBe(object);
          expect(object.name).toBe('Mutation');
        }
      },

      mutationMethodDirective: class extends SchemaDirectiveVisitor {
        public visitFieldDefinition(
          field: GraphQLField<any, any>,
          details: {
            objectType: GraphQLObjectType;
          },
        ) {
          expect(this.visitedType).toBe(field);
          expect(field.name).toBe('addPerson');
          expect(details.objectType).toBe(mutationObjectType);
          expect(field.args.length).toBe(1);
          mutationField = field;
        }
      },

      mutationArgumentDirective: class extends SchemaDirectiveVisitor {
        public visitArgumentDefinition(
          arg: GraphQLArgument,
          details: {
            field: GraphQLField<any, any>;
            objectType: GraphQLObjectType;
          },
        ) {
          expect(this.visitedType).toBe(arg);
          expect(arg.name).toBe('input');
          expect(details.field).toBe(mutationField);
          expect(details.objectType).toBe(mutationObjectType);
          expect(details.field.args[0]).toBe(arg);
        }
      },

      enumTypeDirective: class extends SchemaDirectiveVisitor {
        public visitEnum(enumType: GraphQLEnumType) {
          expect(this.visitedType).toBe(enumType);
          expect(enumType.name).toBe('Gender');
          enumObjectType = enumType;
        }
      },

      enumTypeExtensionDirective: class extends SchemaDirectiveVisitor {
        public visitEnum(enumType: GraphQLEnumType) {
          expect(this.visitedType).toBe(enumType);
          expect(enumType.name).toBe('Gender');
          enumObjectType = enumType;
        }
      },

      enumValueDirective: class extends SchemaDirectiveVisitor {
        public visitEnumValue(
          value: GraphQLEnumValue,
          details: {
            enumType: GraphQLEnumType;
          },
        ) {
          expect(this.visitedType).toBe(value);
          expect(value.name).toBe('NONBINARY');
          expect(value.value).toBe('NONBINARY');
          expect(details.enumType).toBe(enumObjectType);
        }
      },

      inputTypeDirective: class extends SchemaDirectiveVisitor {
        public visitInputObject(object: GraphQLInputObjectType) {
          inputObjectType = object;
          expect(this.visitedType).toBe(object);
          expect(object.name).toBe('PersonInput');
        }
      },

      inputTypeExtensionDirective: class extends SchemaDirectiveVisitor {
        public visitInputObject(object: GraphQLInputObjectType) {
          inputObjectType = object;
          expect(this.visitedType).toBe(object);
          expect(object.name).toBe('PersonInput');
        }
      },

      inputFieldDirective: class extends SchemaDirectiveVisitor {
        public visitInputFieldDefinition(
          field: GraphQLInputField,
          details: {
            objectType: GraphQLInputObjectType;
          },
        ) {
          expect(this.visitedType).toBe(field);
          expect(field.name).toBe('name');
          expect(details.objectType).toBe(inputObjectType);
        }
      },
    });
  });

  test('can check if a visitor method is implemented', () => {
    class Visitor extends SchemaVisitor {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      public notVisitorMethod() {}

      public visitObject(object: GraphQLObjectType) {
        return object;
      }
    }

    expect(Visitor.implementsVisitorMethod('notVisitorMethod')).toBe(false);

    expect(Visitor.implementsVisitorMethod('visitObject')).toBe(true);

    expect(Visitor.implementsVisitorMethod('visitInputFieldDefinition')).toBe(
      false,
    );

    expect(Visitor.implementsVisitorMethod('visitBogusType')).toBe(false);
  });

  test('can use visitSchema for simple visitor patterns', () => {
    class SimpleVisitor extends SchemaVisitor {
      public visitCount = 0;
      public names: Array<string> = [];

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
        expect(this.schema.getType(object.name)).toBe(object);
        this.names.push(object.name);
      }
    }

    const schema = makeExecutableSchema({ typeDefs });
    const visitor = new SimpleVisitor(schema);
    visitor.visit();
    expect(visitor.names.sort((a, b) => a.localeCompare(b))).toEqual([
      'Mutation',
      'Person',
      'Query',
    ]);
  });

  test('can use SchemaDirectiveVisitor as a no-op visitor', () => {
    const schema = makeExecutableSchema({ typeDefs });
    const methodNamesEncountered = new Set<string>();

    class EnthusiasticVisitor extends SchemaDirectiveVisitor {
      public static implementsVisitorMethod(name: string) {
        // Pretend this class implements all visitor methods. This is safe
        // because the SchemaVisitor base class provides empty stubs for all
        // the visitor methods that might be called.
        methodNamesEncountered.add(name);
        return true;
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

    for (const methodName of methodNamesEncountered) {
      expect(methodName in SchemaVisitor.prototype).toBeTruthy();
    }
  });

  test('can handle declared arguments', () => {
    const schemaText = `
    directive @oyez(
      times: Int = 5,
      party: Party = IMPARTIAL,
    ) on OBJECT | FIELD_DEFINITION

    schema {
      query: Courtroom
    }

    type Courtroom @oyez {
      judge: String @oyez(times: 0)
      marshall: String @oyez
    }

    enum Party {
      DEFENSE
      PROSECUTION
      IMPARTIAL
    }`;

    const schema = makeExecutableSchema({ typeDefs: schemaText });
    const context = {
      objectCount: 0,
      fieldCount: 0,
    };

    const visitors = SchemaDirectiveVisitor.visitSchemaDirectives(
      schema,
      {
        oyez: class extends SchemaDirectiveVisitor {
          public static getDirectiveDeclaration(
            name: string,
            theSchema: GraphQLSchema,
          ) {
            expect(theSchema).toBe(schema);
            const prev = schema.getDirective(name);
            prev.args.some((arg) => {
              if (arg.name === 'times') {
                // Override the default value of the times argument to be 3
                // instead of 5.
                arg.defaultValue = 3;
                return true;
              }
              return false;
            });
            return prev;
          }

          public visitObject() {
            ++this.context.objectCount;
            expect(this.args.times).toBe(3);
          }

          public visitFieldDefinition(field: GraphQLField<any, any>) {
            ++this.context.fieldCount;
            if (field.name === 'judge') {
              expect(this.args.times).toBe(0);
            } else if (field.name === 'marshall') {
              expect(this.args.times).toBe(3);
            }
            expect(this.args.party).toBe('IMPARTIAL');
          }
        },
      },
      context,
    );

    expect(context.objectCount).toBe(1);
    expect(context.fieldCount).toBe(2);

    expect(Object.keys(visitors)).toEqual(['oyez']);
    expect(
      visitors.oyez.map(
        (v) =>
          (v.visitedType as GraphQLObjectType | GraphQLField<any, any>).name,
      ),
    ).toEqual(['Courtroom', 'judge', 'marshall']);
  });

  test('can be used to implement the @upper example', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
      directive @upper on FIELD_DEFINITION

      type Query {
        hello: String @upper
      }`,
      schemaDirectives: {
        upper: class extends SchemaDirectiveVisitor {
          public visitFieldDefinition(field: GraphQLField<any, any>) {
            const { resolve = defaultFieldResolver } = field;
            field.resolve = async function (...args) {
              const result = await resolve.apply(this, args);
              if (typeof result === 'string') {
                return result.toUpperCase();
              }
              return result;
            };
          }
        },
      },
      resolvers: {
        Query: {
          hello() {
            return 'hello world';
          },
        },
      },
    });

    return graphql(
      schema,
      `
        query {
          hello
        }
      `,
    ).then(({ data }) => {
      expect(data).toEqual({
        hello: 'HELLO WORLD',
      });
    });
  });

  test('can be used to implement the @date example', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
      directive @date(format: String) on FIELD_DEFINITION

      scalar Date

      type Query {
        today: Date @date(format: "mmmm d, yyyy")
      }`,

      schemaDirectives: {
        date: class extends SchemaDirectiveVisitor {
          public visitFieldDefinition(field: GraphQLField<any, any>) {
            const { resolve = defaultFieldResolver } = field;
            const { format } = this.args;
            field.type = GraphQLString;
            field.resolve = async function (...args) {
              const date = await resolve.apply(this, args);
              return formatDate(date, format, true);
            };
          }
        },
      },

      resolvers: {
        Query: {
          today() {
            return new Date(1519688273858).toUTCString();
          },
        },
      },
    });

    return graphql(
      schema,
      `
        query {
          today
        }
      `,
    ).then(({ data }) => {
      expect(data).toEqual({
        today: 'February 26, 2018',
      });
    });
  });

  test('can be used to implement the @date by adding an argument', async () => {
    class FormattableDateDirective extends SchemaDirectiveVisitor {
      public visitFieldDefinition(field: GraphQLField<any, any>) {
        const { resolve = defaultFieldResolver } = field;
        const { defaultFormat } = this.args;

        field.args.push(
          Object.create({
            name: 'format',
            type: GraphQLString,
          }),
        );

        field.type = GraphQLString;
        field.resolve = async function (
          source,
          { format, ...args },
          context,
          info,
        ) {
          const newFormat = format || defaultFormat;
          const date = await resolve.call(this, source, args, context, info);
          return formatDate(date, newFormat, true);
        };
      }
    }

    const schema = makeExecutableSchema({
      typeDefs: `
      directive @date(
        defaultFormat: String = "mmmm d, yyyy"
      ) on FIELD_DEFINITION

      scalar Date

      type Query {
        today: Date @date
      }`,

      schemaDirectives: {
        date: FormattableDateDirective,
      },

      resolvers: {
        Query: {
          today() {
            return new Date(1521131357195);
          },
        },
      },
    });

    const resultNoArg = await graphql(schema, 'query { today }');

    if (resultNoArg.errors != null) {
      expect(resultNoArg.errors).toEqual([]);
    }

    expect(resultNoArg.data).toEqual({ today: 'March 15, 2018' });

    const resultWithArg = await graphql(
      schema,
      `
        query {
          today(format: "dd mmm yyyy")
        }
      `,
    );

    if (resultWithArg.errors != null) {
      expect(resultWithArg.errors).toEqual([]);
    }

    expect(resultWithArg.data).toEqual({ today: '15 Mar 2018' });
  });

  test('can be used to implement the @intl example', () => {
    function translate(text: string, path: Array<string>, locale: string) {
      expect(text).toBe('hello');
      expect(path).toEqual(['Query', 'greeting']);
      expect(locale).toBe('fr');
      return 'bonjour';
    }

    const context = {
      locale: 'fr',
    };

    const schema = makeExecutableSchema({
      typeDefs: `
      directive @intl on FIELD_DEFINITION

      type Query {
        greeting: String @intl
      }`,

      schemaDirectives: {
        intl: class extends SchemaDirectiveVisitor {
          public visitFieldDefinition(
            field: GraphQLField<any, any>,
            details: {
              objectType: GraphQLObjectType;
            },
          ) {
            const { resolve = defaultFieldResolver } = field;
            field.resolve = async function (...args: Array<any>) {
              const defaultText = await resolve.apply(this, args);
              // In this example, path would be ["Query", "greeting"]:
              const path = [details.objectType.name, field.name];
              expect(args[2]).toBe(context);
              return translate(defaultText, path, context.locale);
            };
          }
        },
      },

      resolvers: {
        Query: {
          greeting() {
            return 'hello';
          },
        },
      },
    });

    return graphql(
      schema,
      `
        query {
          greeting
        }
      `,
      null,
      context,
    ).then(({ data }) => {
      expect(data).toEqual({
        greeting: 'bonjour',
      });
    });
  });

  test('can be used to implement the @auth example', async () => {
    const roles = ['UNKNOWN', 'USER', 'REVIEWER', 'ADMIN'];

    function getUser(token: string) {
      return {
        hasRole(role: string) {
          const tokenIndex = roles.indexOf(token);
          const roleIndex = roles.indexOf(role);
          return roleIndex >= 0 && tokenIndex >= roleIndex;
        },
      };
    }

    class AuthDirective extends SchemaDirectiveVisitor {
      public visitObject(type: GraphQLObjectType) {
        this.ensureFieldsWrapped(type);
        (type as any)._requiredAuthRole = this.args.requires;
      }

      // Visitor methods for nested types like fields and arguments
      // also receive a details object that provides information about
      // the parent and grandparent types.
      public visitFieldDefinition(
        field: GraphQLField<any, any>,
        details: { objectType: GraphQLObjectType },
      ) {
        this.ensureFieldsWrapped(details.objectType);
        (field as any)._requiredAuthRole = this.args.requires;
      }

      public ensureFieldsWrapped(objectType: GraphQLObjectType) {
        // Mark the GraphQLObjectType object to avoid re-wrapping:
        if ((objectType as any)._authFieldsWrapped) {
          return;
        }
        (objectType as any)._authFieldsWrapped = true;

        const fields = objectType.getFields();

        Object.keys(fields).forEach((fieldName) => {
          const field = fields[fieldName];
          const { resolve = defaultFieldResolver } = field;
          field.resolve = function (...args: Array<any>) {
            // Get the required Role from the field first, falling back
            // to the objectType if no Role is required by the field:
            const requiredRole =
              (field as any)._requiredAuthRole ||
              (objectType as any)._requiredAuthRole;

            if (!requiredRole) {
              return resolve.apply(this, args);
            }

            const context = args[2];
            const user = getUser(context.headers.authToken);
            if (!user.hasRole(requiredRole)) {
              throw new Error('not authorized');
            }

            return resolve.apply(this, args);
          };
        });
      }
    }

    const schema = makeExecutableSchema({
      typeDefs: `
      directive @auth(
        requires: Role = ADMIN,
      ) on OBJECT | FIELD_DEFINITION

      enum Role {
        ADMIN
        REVIEWER
        USER
        UNKNOWN
      }

      type User @auth(requires: USER) {
        name: String
        banned: Boolean @auth(requires: ADMIN)
        canPost: Boolean @auth(requires: REVIEWER)
      }

      type Query {
        users: [User]
      }`,

      schemaDirectives: {
        auth: AuthDirective,
      },

      resolvers: {
        Query: {
          users() {
            return [
              {
                banned: true,
                canPost: false,
                name: 'Ben',
              },
            ];
          },
        },
      },
    });

    function execWithRole(role: string): Promise<ExecutionResult> {
      return graphql(
        schema,
        `
          query {
            users {
              name
              banned
              canPost
            }
          }
        `,
        null,
        {
          headers: {
            authToken: role,
          },
        },
      );
    }

    function checkErrors(
      expectedCount: number,
      ...expectedNames: Array<string>
    ) {
      return function ({
        errors = [],
        data,
      }: {
        errors: Array<any>;
        data: any;
      }) {
        expect(errors.length).toBe(expectedCount);
        expect(
          errors.every((error) => error.message === 'not authorized'),
        ).toBeTruthy();
        const actualNames = errors.map((error) => error.path.slice(-1)[0]);
        expect(expectedNames.sort((a, b) => a.localeCompare(b))).toEqual(
          actualNames.sort((a, b) => a.localeCompare(b)),
        );
        return data;
      };
    }

    return Promise.all([
      execWithRole('UNKNOWN').then(checkErrors(3, 'banned', 'canPost', 'name')),
      execWithRole('USER').then(checkErrors(2, 'banned', 'canPost')),
      execWithRole('REVIEWER').then(checkErrors(1, 'banned')),
      execWithRole('ADMIN')
        .then(checkErrors(0))
        .then((data) => {
          expect(data.users.length).toBe(1);
          expect(data.users[0].banned).toBe(true);
          expect(data.users[0].canPost).toBe(false);
          expect(data.users[0].name).toBe('Ben');
        }),
    ]);
  });

  test('can be used to implement the @length example', async () => {
    class LimitedLengthType extends GraphQLScalarType {
      constructor(type: GraphQLScalarType, maxLength: number) {
        super({
          name: `LengthAtMost${maxLength.toString()}`,

          serialize(value: string) {
            const newValue: string = type.serialize(value);
            expect(typeof newValue.length).toBe('number');
            if (newValue.length > maxLength) {
              throw new Error(
                `expected ${newValue.length.toString(
                  10,
                )} to be at most ${maxLength.toString(10)}`,
              );
            }
            return newValue;
          },

          parseValue(value: string) {
            return type.parseValue(value);
          },

          parseLiteral(ast: StringValueNode) {
            return type.parseLiteral(ast, {});
          },
        });
      }
    }

    const schema = makeExecutableSchema({
      typeDefs: `
      directive @length(max: Int) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION

      type Query {
        books: [Book]
      }

      type Book {
        title: String @length(max: 10)
      }

      type Mutation {
        createBook(book: BookInput): Book
      }

      input BookInput {
        title: String! @length(max: 10)
      }`,

      schemaDirectives: {
        length: class extends SchemaDirectiveVisitor {
          public visitInputFieldDefinition(field: GraphQLInputField) {
            this.wrapType(field);
          }

          public visitFieldDefinition(field: GraphQLField<any, any>) {
            this.wrapType(field);
          }

          private wrapType(field: GraphQLInputField | GraphQLField<any, any>) {
            if (isNonNullType(field.type) && isScalarType(field.type.ofType)) {
              field.type = new GraphQLNonNull(
                new LimitedLengthType(field.type.ofType, this.args.max),
              );
            } else if (isScalarType(field.type)) {
              field.type = new LimitedLengthType(field.type, this.args.max);
            } else {
              throw new Error(`Not a scalar type: ${field.type.toString()}`);
            }
          }
        },
      },

      resolvers: {
        Query: {
          books() {
            return [
              {
                title: 'abcdefghijklmnopqrstuvwxyz',
              },
            ];
          },
        },
        Mutation: {
          createBook(_parent, args) {
            return args.book;
          },
        },
      },
    });

    const { errors } = await graphql(
      schema,
      `
        query {
          books {
            title
          }
        }
      `,
    );
    expect(errors.length).toBe(1);
    expect(errors[0].message).toBe('expected 26 to be at most 10');

    const result = await graphql(
      schema,
      `
        mutation {
          createBook(book: { title: "safe title" }) {
            title
          }
        }
      `,
    );

    if (result.errors != null) {
      expect(result.errors).toEqual([]);
    }

    expect(result.data).toEqual({
      createBook: {
        title: 'safe title',
      },
    });
  });

  test('can be used to implement the @uniqueID example', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
      directive @uniqueID(name: String, from: [String]) on OBJECT

      type Query {
        people: [Person]
        locations: [Location]
      }

      type Person @uniqueID(name: "uid", from: ["personID"]) {
        personID: Int
        name: String
      }

      type Location @uniqueID(name: "uid", from: ["locationID"]) {
        locationID: Int
        address: String
      }`,

      schemaDirectives: {
        uniqueID: class extends SchemaDirectiveVisitor {
          public visitObject(type: GraphQLObjectType) {
            const { name, from } = this.args;
            type.getFields()[name] = Object.create({
              name,
              type: GraphQLID,
              description: 'Unique ID',
              args: [],
              resolve(object: any) {
                const hash = createHash('sha1');
                hash.update(type.name);
                from.forEach((fieldName: string) => {
                  hash.update(String(object[fieldName]));
                });
                return hash.digest('hex');
              },
            });
          }
        },
      },

      resolvers: {
        Query: {
          people() {
            return [
              {
                personID: 1,
                name: 'Ben',
              },
            ];
          },
          locations() {
            return [
              {
                locationID: 1,
                address: '140 10th St',
              },
            ];
          },
        },
      },
    });

    return graphql(
      schema,
      `
        query {
          people {
            uid
            personID
            name
          }
          locations {
            uid
            locationID
            address
          }
        }
      `,
      null,
      {},
    ).then((result) => {
      const { data } = result;

      expect(data.people).toEqual([
        {
          uid: '580a207c8e94f03b93a2b01217c3cc218490571a',
          personID: 1,
          name: 'Ben',
        },
      ]);

      expect(data.locations).toEqual([
        {
          uid: 'c31b71e6e23a7ae527f94341da333590dd7cba96',
          locationID: 1,
          address: '140 10th St',
        },
      ]);
    });
  });

  test('automatically updates references to changed types', () => {
    const schema = makeExecutableSchema({
      typeDefs,
      schemaDirectives: {
        objectTypeDirective: class extends SchemaDirectiveVisitor {
          public visitObject(object: GraphQLObjectType) {
            return Object.create(object, {
              name: { value: 'Human' },
            });
          }
        },
      },
    });

    const Query = schema.getType('Query') as GraphQLObjectType;
    const peopleType = Query.getFields().people.type;
    if (isListType(peopleType)) {
      expect(peopleType.ofType).toBe(schema.getType('Human'));
    } else {
      throw new Error('Query.people not a GraphQLList type');
    }

    const Mutation = schema.getType('Mutation') as GraphQLObjectType;
    const addPersonResultType = Mutation.getFields().addPerson.type;
    expect(addPersonResultType).toBe(
      schema.getType('Human') as GraphQLOutputType,
    );

    const WhateverUnion = schema.getType('WhateverUnion') as GraphQLUnionType;
    const found = WhateverUnion.getTypes().some((type) => {
      if (type.name === 'Human') {
        expect(type).toBe(schema.getType('Human'));
        return true;
      }
      return false;
    });
    expect(found).toBe(true);

    // Make sure that the Person type was actually removed.
    expect(typeof schema.getType('Person')).toBe('undefined');
  });

  test('can remove enum values', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
      directive @remove(if: Boolean) on ENUM_VALUE

      type Query {
        age(unit: AgeUnit): Int
      }

      enum AgeUnit {
        DOG_YEARS
        TURTLE_YEARS @remove(if: true)
        PERSON_YEARS @remove(if: false)
      }`,

      schemaDirectives: {
        remove: class extends SchemaDirectiveVisitor {
          public visitEnumValue(): null {
            if (this.args.if) {
              return null;
            }
          }
        },
      },
    });

    const AgeUnit = schema.getType('AgeUnit') as GraphQLEnumType;
    expect(AgeUnit.getValues().map((value) => value.name)).toEqual([
      'DOG_YEARS',
      'PERSON_YEARS',
    ]);
  });

  test("can modify enum value's value", () => {
    const schema = makeExecutableSchema({
      typeDefs: `
      directive @value(new: String!) on ENUM_VALUE

      type Query {
        device: Device
      }

      enum Device {
        PHONE
        TABLET
        LAPTOP @value(new: "COMPUTER")
      }`,

      schemaDirectives: {
        value: class extends SchemaDirectiveVisitor {
          public visitEnumValue(value: GraphQLEnumValue): GraphQLEnumValue {
            return {
              ...value,
              value: this.args.new,
            };
          }
        },
      },
    });

    const Device = schema.getType('Device') as GraphQLEnumType;
    expect(Device.getValues().map((value) => value.value)).toEqual([
      'PHONE',
      'TABLET',
      'COMPUTER',
    ]);
  });

  test('can swap names of GraphQLNamedType objects', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
      directive @rename(to: String) on OBJECT

      type Query {
        people: [Person]
      }

      type Person @rename(to: "Human") {
        heightInInches: Int
      }

      scalar Date

      type Human @rename(to: "Person") {
        born: Date
      }`,

      schemaDirectives: {
        rename: class extends SchemaDirectiveVisitor {
          public visitObject(object: GraphQLObjectType) {
            object.name = this.args.to;
          }
        },
      },
    });

    const Human = schema.getType('Human') as GraphQLObjectType;
    expect(Human.name).toBe('Human');
    expect(Human.getFields().heightInInches.type).toBe(GraphQLInt);

    const Person = schema.getType('Person') as GraphQLObjectType;
    expect(Person.name).toBe('Person');
    expect(Person.getFields().born.type).toBe(
      schema.getType('Date') as GraphQLScalarType,
    );

    const Query = schema.getType('Query') as GraphQLObjectType;
    const peopleType = Query.getFields().people.type as GraphQLList<
      GraphQLObjectType
    >;
    expect(peopleType.ofType).toBe(Human);
  });

  test('does not enforce query directive locations (issue #680)', () => {
    const visited = new Set<GraphQLObjectType>();
    makeExecutableSchema({
      typeDefs: `
      directive @hasScope(scope: [String]) on QUERY | FIELD | OBJECT

      type Query @hasScope {
        oyez: String
      }`,

      schemaDirectives: {
        hasScope: class extends SchemaDirectiveVisitor {
          public visitObject(object: GraphQLObjectType) {
            expect(object.name).toBe('Query');
            visited.add(object);
          }
        },
      },
    });

    expect(visited.size).toBe(1);
  });

  test('allows multiple directives when first replaces type (issue #851)', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
          directive @upper on FIELD_DEFINITION
          directive @reverse on FIELD_DEFINITION

          type Query {
            hello: String @upper @reverse
          }`,
      schemaDirectives: {
        upper: class extends SchemaDirectiveVisitor {
          public visitFieldDefinition(field: GraphQLField<any, any>) {
            const { resolve = defaultFieldResolver } = field;
            const newField = { ...field };

            newField.resolve = async function (...args: Array<any>) {
              const result = await resolve.apply(this, args);
              if (typeof result === 'string') {
                return result.toUpperCase();
              }
              return result;
            };

            return newField;
          }
        },
        reverse: class extends SchemaDirectiveVisitor {
          public visitFieldDefinition(field: GraphQLField<any, any>) {
            const { resolve = defaultFieldResolver } = field;
            field.resolve = async function (...args: Array<any>) {
              const result = await resolve.apply(this, args);
              if (typeof result === 'string') {
                return result.split('').reverse().join('');
              }
              return result;
            };
          }
        },
      },
      resolvers: {
        Query: {
          hello() {
            return 'hello world';
          },
        },
      },
    });

    return graphql(
      schema,
      `
        query {
          hello
        }
      `,
    ).then(({ data }) => {
      expect(data).toEqual({
        hello: 'DLROW OLLEH',
      });
    });
  });

  test('preserves ability to create fields of different types with same name (issue 1462)', () => {
    function validateStr(value: any, {
      min = null,
      message = null,
    } : {
      min: number,
      message: string,
    }) {
      if(min && value.length < min) {
        throw new Error(message || `Please ensure the value is at least ${min} characters.`);
      }
    }

    class ConstraintType extends GraphQLScalarType {
      constructor(
        type: GraphQLScalarType,
        args: {
          min: number,
          message: string,
        },
      ) {
        super({
          name: 'ConstraintType',
          serialize: (value) => type.serialize(value),
          parseValue: (value) => {
            const trimmed = value.trim();
            validateStr(trimmed, args);
            return type.parseValue(trimmed);
          }
        });
      }
    }

    class ConstraintDirective extends SchemaDirectiveVisitor {
      visitInputFieldDefinition(field: GraphQLInputField) {
        if (isNonNullType(field.type) && isScalarType(field.type.ofType)) {
          field.type = new GraphQLNonNull(
            new ConstraintType(field.type.ofType, this.args)
          );
        } else if (isScalarType(field.type)) {
          field.type = new ConstraintType(field.type, this.args);
        } else {
          throw new Error(`Not a scalar type: ${field.type}`);
        }
      }
    }

    const schema = makeExecutableSchema({
      typeDefs: `
        directive @constraint(min: Int, message: String) on INPUT_FIELD_DEFINITION

        input BookInput {
          name: String! @constraint(min: 10, message: "Book input error!")
        }

        input AuthorInput {
          name: String! @constraint(min: 4, message: "Author input error")
        }

        type Query {
          getBookById(id: Int): String
        }

        type Mutation {
          createBook(input: BookInput!): String
          createAuthor(input: AuthorInput!): String
        }
      `,
      resolvers: {
        Mutation: {
          createBook() {
            return 'yes';
          },
          createAuthor() {
            return 'no';
          }
        }
      },
      schemaDirectives: {
        constraint: ConstraintDirective
      }
    });

    return graphql(
      schema,
      `
        mutation {
          createAuthor(input: {
            name: "M"
          })
        }
      `,
    ).then(({ errors }) => {
      expect(errors[0].originalError).toEqual(new Error('Author input error'));
    });
  });
});
