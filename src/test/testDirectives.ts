import { assert } from 'chai';
import { makeExecutableSchema } from '../makeExecutableSchema';
import { VisitableSchemaType } from '../Interfaces';
import { SchemaDirectiveVisitor } from '../utils/SchemaDirectiveVisitor';
import { SchemaVisitor } from '../utils/SchemaVisitor';
import { visitSchema } from '../utils/visitSchema';
import {
  ExecutionResult,
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
} from 'graphql';

import formatDate = require('dateformat');

const typeDefs = `
directive @schemaDirective(role: String) on SCHEMA
directive @queryTypeDirective on OBJECT
directive @queryFieldDirective on FIELD_DEFINITION
directive @enumTypeDirective on ENUM
directive @enumValueDirective on ENUM_VALUE
directive @dateDirective(tz: String) on SCALAR
directive @interfaceDirective on INTERFACE
directive @interfaceFieldDirective on FIELD_DEFINITION
directive @inputTypeDirective on INPUT_OBJECT
directive @inputFieldDirective on INPUT_FIELD_DEFINITION
directive @mutationTypeDirective on OBJECT
directive @mutationArgumentDirective on ARGUMENT_DEFINITION
directive @mutationMethodDirective on FIELD_DEFINITION
directive @objectTypeDirective on OBJECT
directive @objectFieldDirective on FIELD_DEFINITION
directive @unionDirective on UNION

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
      resolvers: {
        Gender: {
          NONBINARY: 'NB',
          FEMALE: 'F',
          MALE: 'M'
        }
      }
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

  it('works with enum and its resolvers', () => {
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
          ISO: 'iso'
        }
      }
    });

    assert.exists(schema.getType('DateFormat'));
    assert.lengthOf(schema.getDirectives(), 4);
    assert.exists(schema.getDirective('date'));
  });

  it('can be implemented with SchemaDirectiveVisitor', () => {
    const visited: Set<GraphQLObjectType> = new Set;
    const schema = makeExecutableSchema({ typeDefs });

    SchemaDirectiveVisitor.visitSchemaDirectives(schema, {
      // The directive subclass can be defined anonymously inline!
      queryTypeDirective: class extends SchemaDirectiveVisitor {
        public static description = 'A @directive for query object types';
        public visitObject(object: GraphQLObjectType) {
          assert.strictEqual(object, schema.getQueryType());
          visited.add(object);
        }
      },
    });

    assert.strictEqual(visited.size, 1);
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
        return; // Just to keep the tslint:no-empty rule satisfied.
      }

      public visitObject(object: GraphQLObjectType) {
        return object;
      }
    }

    assert.strictEqual(
      Visitor.implementsVisitorMethod('notVisitorMethod'),
      false,
    );

    assert.strictEqual(
      Visitor.implementsVisitorMethod('visitObject'),
      true,
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

  it('can handle declared arguments', () => {
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

    const visitors = SchemaDirectiveVisitor.visitSchemaDirectives(schema, {
      oyez: class extends SchemaDirectiveVisitor {
        public static getDirectiveDeclaration(
          name: string,
          theSchema: GraphQLSchema,
        ) {
          assert.strictEqual(theSchema, schema);
          const prev = schema.getDirective(name);
          prev.args.some(arg => {
            if (arg.name === 'times') {
              // Override the default value of the times argument to be 3
              // instead of 5.
              arg.defaultValue = 3;
              return true;
            }
          });
          return prev;
        }

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
          assert.strictEqual(this.args.party, 'IMPARTIAL');
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

  it('can be used to implement the @upper example', () => {
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
            field.resolve = async function (...args: any[]) {
              const result = await resolve.apply(this, args);
              if (typeof result === 'string') {
                return result.toUpperCase();
              }
              return result;
            };
          }
        }
      },
      resolvers: {
        Query: {
          hello() {
            return 'hello world';
          }
        }
      }
    });

    return graphql(schema, `
    query {
      hello
    }
    `).then(({ data }) => {
      assert.deepEqual(data, {
        hello: 'HELLO WORLD'
      });
    });
  });

  it('can be used to implement the @date example', () => {
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
            field.resolve = async function (...args: any[]) {
              const date = await resolve.apply(this, args);
              return formatDate(date, format, true);
            };
          }
        }
      },

      resolvers: {
        Query: {
          today() {
            return new Date(1519688273858).toUTCString();
          }
        }
      }
    });

    return graphql(schema, `
    query {
      today
    }
    `).then(({ data }) => {
      assert.deepEqual(data, {
        today: 'February 26, 2018'
      });
    });
  });

  it('can be used to implement the @date by adding an argument', async () => {
    class FormattableDateDirective extends SchemaDirectiveVisitor {
      public visitFieldDefinition(field: GraphQLField<any, any>) {
        const { resolve = defaultFieldResolver } = field;
        const { defaultFormat } = this.args;

        field.args.push(Object.create({
          name: 'format',
          type: GraphQLString,
        }));

        field.type = GraphQLString;
        field.resolve = async function (source, { format, ...args }, context, info) {
          format = format || defaultFormat;
          const date = await resolve.call(this, source, args, context, info);
          return formatDate(date, format, true);
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
        date: FormattableDateDirective
      },

      resolvers: {
        Query: {
          today() {
            return new Date(1521131357195);
          }
        }
      }
    });

    const resultNoArg = await graphql(schema, `query { today }`);

    if (resultNoArg.errors) {
      assert.deepEqual(resultNoArg.errors, []);
    }

    assert.deepEqual(
      resultNoArg.data,
      { today: 'March 15, 2018' }
    );

    const resultWithArg = await graphql(schema, `
    query {
      today(format: "dd mmm yyyy")
    }`);

    if (resultWithArg.errors) {
      assert.deepEqual(resultWithArg.errors, []);
    }

    assert.deepEqual(
      resultWithArg.data,
      { today: '15 Mar 2018' }
    );
  });

  it('can be used to implement the @intl example', () => {
    function translate(
      text: string,
      path: string[],
      locale: string,
    ) {
      assert.strictEqual(text, 'hello');
      assert.deepEqual(path, ['Query', 'greeting']);
      assert.strictEqual(locale, 'fr');
      return 'bonjour';
    }

    const context = {
      locale: 'fr'
    };

    const schema = makeExecutableSchema({
      typeDefs: `
      directive @intl on FIELD_DEFINITION

      type Query {
        greeting: String @intl
      }`,

      schemaDirectives: {
        intl: class extends SchemaDirectiveVisitor {
          public visitFieldDefinition(field: GraphQLField<any, any>, details: {
            objectType: GraphQLObjectType,
          }) {
            const { resolve = defaultFieldResolver } = field;
            field.resolve = async function (...args: any[]) {
              const defaultText = await resolve.apply(this, args);
              // In this example, path would be ["Query", "greeting"]:
              const path = [details.objectType.name, field.name];
              assert.strictEqual(args[2], context);
              return translate(defaultText, path, context.locale);
            };
          }
        }
      },

      resolvers: {
        Query: {
          greeting() {
            return 'hello';
          }
        }
      }
    });

    return graphql(schema, `
    query {
      greeting
    }
    `, null, context).then(({ data }) => {
      assert.deepEqual(data, {
        greeting: 'bonjour'
      });
    });
  });

  it('can be used to implement the @auth example', async () => {
    const roles = [
      'UNKNOWN',
      'USER',
      'REVIEWER',
      'ADMIN',
    ];

    function getUser(token: string) {
      return {
        hasRole(role: string) {
          const tokenIndex = roles.indexOf(token);
          const roleIndex = roles.indexOf(role);
          return roleIndex >= 0 && tokenIndex >= roleIndex;
        }
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

        Object.keys(fields).forEach(fieldName => {
          const field = fields[fieldName];
          const { resolve = defaultFieldResolver } = field;
          field.resolve = async function (...args: any[]) {
            // Get the required Role from the field first, falling back
            // to the objectType if no Role is required by the field:
            const requiredRole =
              (field as any)._requiredAuthRole ||
              (objectType as any)._requiredAuthRole;

            if (! requiredRole) {
              return resolve.apply(this, args);
            }

            const context = args[2];
            const user = await getUser(context.headers.authToken);
            if (! user.hasRole(requiredRole)) {
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
        auth: AuthDirective
      },

      resolvers: {
        Query: {
          users() {
            return [{
              banned: true,
              canPost: false,
              name: 'Ben'
            }];
          }
        }
      }
    });

    function execWithRole(role: string): Promise<ExecutionResult> {
      return graphql(schema, `
      query {
        users {
          name
          banned
          canPost
        }
      }
      `, null, {
        headers: {
          authToken: role,
        }
      });
    }

    function checkErrors(
      expectedCount: number,
      ...expectedNames: string[]
    ) {
      return function ({ errors = [], data }: {
        errors: any[],
        data: any,
      }) {
        assert.strictEqual(errors.length, expectedCount);
        assert(errors.every(error => error.message === 'not authorized'));
        const actualNames = errors.map(error => error.path.slice(-1)[0]);
        assert.deepEqual(
          expectedNames.sort(),
          actualNames.sort(),
        );
        return data;
      };
    }

    return Promise.all([
      execWithRole('UNKNOWN').then(checkErrors(3, 'banned', 'canPost', 'name')),
      execWithRole('USER').then(checkErrors(2, 'banned', 'canPost')),
      execWithRole('REVIEWER').then(checkErrors(1, 'banned')),
      execWithRole('ADMIN').then(checkErrors(0)).then(data => {
        assert.strictEqual(data.users.length, 1);
        assert.strictEqual(data.users[0].banned, true);
        assert.strictEqual(data.users[0].canPost, false);
        assert.strictEqual(data.users[0].name, 'Ben');
      }),
    ]);
  });

  it('can be used to implement the @length example', async () => {
    class LimitedLengthType extends GraphQLScalarType {
      constructor(type: GraphQLScalarType, maxLength: number) {
        super({
          name: `LengthAtMost${maxLength}`,

          serialize(value: string) {
            value = type.serialize(value);
            assert.strictEqual(typeof value.length, 'number');
            assert.isAtMost(value.length, maxLength);
            return value;
          },

          parseValue(value: string) {
            return type.parseValue(value);
          },

          parseLiteral(ast: StringValueNode) {
            return type.parseLiteral(ast, {});
          }
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
            if (field.type instanceof GraphQLNonNull &&
                field.type.ofType instanceof GraphQLScalarType) {
              field.type = new GraphQLNonNull(
                new LimitedLengthType(field.type.ofType, this.args.max));
            } else if (field.type instanceof GraphQLScalarType) {
              field.type = new LimitedLengthType(field.type, this.args.max);
            } else {
              throw new Error(`Not a scalar type: ${field.type}`);
            }
          }
        }
      },

      resolvers: {
        Query: {
          books() {
            return [{
              title: 'abcdefghijklmnopqrstuvwxyz'
            }];
          }
        },
        Mutation: {
          createBook(parent, args) {
            return args.book;
          }
        }
      }
    });

    const { errors } = await graphql(schema, `
    query {
      books {
        title
      }
    }
    `);
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(
      errors[0].message,
      'expected 26 to be at most 10',
    );

    const result = await graphql(schema, `
    mutation {
      createBook(book: { title: "safe title" }) {
        title
      }
    }
    `);

    if (result.errors) {
      assert.deepEqual(result.errors, []);
    }

    assert.deepEqual(result.data, {
      createBook: {
        title: 'safe title'
      }
    });
  });

  it('can be used to implement the @uniqueID example', () => {
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
              name: name,
              type: GraphQLID,
              description: 'Unique ID',
              args: [],
              resolve(object: any) {
                const hash = require('crypto').createHash('sha1');
                hash.update(type.name);
                from.forEach((fieldName: string) => {
                  hash.update(String(object[fieldName]));
                });
                return hash.digest('hex');
              },
            });
          }
        }
      },

      resolvers: {
        Query: {
          people(...args: any[]) {
            return [{
              personID: 1,
              name: 'Ben',
            }];
          },
          locations(...args: any[]) {
            return [{
              locationID: 1,
              address: '140 10th St',
            }];
          }
        }
      }
    });

    return graphql(schema, `
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
    `, null, context).then(result => {
      const { data } = result;

      assert.deepEqual(data.people, [{
        uid: '580a207c8e94f03b93a2b01217c3cc218490571a',
        personID: 1,
        name: 'Ben',
      }]);

      assert.deepEqual(data.locations, [{
        uid: 'c31b71e6e23a7ae527f94341da333590dd7cba96',
        locationID: 1,
        address: '140 10th St',
      }]);
    });
  });

  it('automatically updates references to changed types', () => {
    const schema = makeExecutableSchema({
      typeDefs,
      schemaDirectives: {
        objectTypeDirective: class extends SchemaDirectiveVisitor {
          public visitObject(object: GraphQLObjectType) {
            return Object.create(object, {
              name: { value: 'Human' }
            });
          }
        }
      }
    });

    const Query = schema.getType('Query') as GraphQLObjectType;
    const peopleType = Query.getFields().people.type;
    if (peopleType instanceof GraphQLList) {
      assert.strictEqual(peopleType.ofType, schema.getType('Human'));
    } else {
      throw new Error('Query.people not a GraphQLList type');
    }

    const Mutation = schema.getType('Mutation') as GraphQLObjectType;
    const addPersonResultType = Mutation.getFields().addPerson.type;
    assert.strictEqual(addPersonResultType, schema.getType('Human') as GraphQLOutputType);

    const WhateverUnion = schema.getType('WhateverUnion') as GraphQLUnionType;
    const found = WhateverUnion.getTypes().some(type => {
      if (type.name === 'Human') {
        assert.strictEqual(type, schema.getType('Human'));
        return true;
      }
    });
    assert.strictEqual(found, true);

    // Make sure that the Person type was actually removed.
    assert.strictEqual(
      typeof schema.getType('Person'),
      'undefined'
    );
  });

  it('can remove enum values', () => {
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
          public visitEnumValue(value: GraphQLEnumValue): null {
            if (this.args.if) {
              return null;
            }
          }
        }
      }
    });

    const AgeUnit = schema.getType('AgeUnit') as GraphQLEnumType;
    assert.deepEqual(
      AgeUnit.getValues().map(value => value.name),
      ['DOG_YEARS', 'PERSON_YEARS']
    );
  });

  it('can swap names of GraphQLNamedType objects', () => {
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
        }
      }
    });

    const Human = schema.getType('Human') as GraphQLObjectType;
    assert.strictEqual(Human.name, 'Human');
    assert.strictEqual(
      Human.getFields().heightInInches.type,
      GraphQLInt,
    );

    const Person = schema.getType('Person') as GraphQLObjectType;
    assert.strictEqual(Person.name, 'Person');
    assert.strictEqual(
      Person.getFields().born.type,
      schema.getType('Date') as GraphQLScalarType,
    );

    const Query = schema.getType('Query') as GraphQLObjectType;
    const peopleType = Query.getFields().people.type as GraphQLList<GraphQLObjectType>;
    assert.strictEqual(
      peopleType.ofType,
      Human
    );
  });

  it('does not enforce query directive locations (issue #680)', () => {
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
            assert.strictEqual(object.name, 'Query');
            visited.add(object);
          }
        }
      }
    });

    assert.strictEqual(visited.size, 1);
  });

  it('allows multiple directives when first replaces type (issue #851)', () => {
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
            const newField = {...field};

            newField.resolve = async function(...args: any[]) {
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
            field.resolve = async function(...args: any[]) {
              const result = await resolve.apply(this, args);
              if (typeof result === 'string') {
                return result
                  .split('')
                  .reverse()
                  .join('');
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
      assert.deepEqual(data, {
        hello: 'DLROW OLLEH',
      });
    });
  });
});
