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
  GraphQLType,
  Kind,
  StringValueNode,
  defaultFieldResolver,
  graphql,
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
      directiveVisitors: {
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

      directiveVisitors: {
        date: class extends SchemaDirectiveVisitor {
          public visitFieldDefinition(field: GraphQLField<any, any>) {
            const { resolve = defaultFieldResolver } = field;
            const { format } = this.args;
            field.type = GraphQLString;
            field.resolve = async function (...args: any[]) {
              const date = await resolve.apply(this, args);
              return require('dateformat')(date, format);
            };
          }
        }
      },

      resolvers: {
        Query: {
          today() {
            return new Date(1519688273858);
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

      directiveVisitors: {
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
    const authReqSymbol = Symbol.for('@auth required role');
    const authWrapSymbol = Symbol.for('@auth wrapped');
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

      directiveVisitors: {
        auth: class extends SchemaDirectiveVisitor {
          public visitObject(type: GraphQLObjectType) {
            this.ensureFieldsWrapped(type);
            type[authReqSymbol] = this.args.requires;
          }

          public visitFieldDefinition(field: GraphQLField<any, any>, details: {
            objectType: GraphQLObjectType,
          }) {
            this.ensureFieldsWrapped(details.objectType);
            field[authReqSymbol] = this.args.requires;
          }

          private ensureFieldsWrapped(type: GraphQLObjectType) {
            // Mark the GraphQLObjectType object to avoid re-wrapping its fields:
            if (type[authWrapSymbol]) {
              return;
            }

            const fields = type.getFields();
            Object.keys(fields).forEach(fieldName => {
              const field = fields[fieldName];
              const { resolve = defaultFieldResolver } = field;
              field.resolve = async function (...args: any[]) {
                // Get the required role from the field first, falling back to the
                // parent GraphQLObjectType if no role is required by the field:
                const requiredRole = field[authReqSymbol] || type[authReqSymbol];
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

            type[authWrapSymbol] = true;
          }
        }
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
      ...expectedNames: string[],
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
      constructor(type: GraphQLType, maxLength: number) {
        super({
          name: `LengthAtMost${maxLength}`,
          serialize(value: string) {
            assert.strictEqual(typeof value, 'string');
            assert.isAtMost(value.length, maxLength);
            return value;
          },

          parseValue(value: string) {
            return String(value);
          },

          parseLiteral(ast: StringValueNode) {
            if (ast.kind === Kind.STRING) {
              return ast.value;
            }
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

      directiveVisitors: {
        length: class extends SchemaDirectiveVisitor {
          public visitInputFieldDefinition(field: GraphQLInputField) {
            this.wrapType(field);
          }

          public visitFieldDefinition(field: GraphQLField<any, any>) {
            this.wrapType(field);
          }

          private wrapType(field: GraphQLInputField | GraphQLField<any, any>) {
            // This LimitedLengthType should be just like field.type except that the
            // serialize method enforces the length limit. For more information about
            // GraphQLScalar type serialization, see the graphql-js implementation:
            // https://github.com/graphql/graphql-js/blob/31ae8a8e8312494b858b69b2ab27b1837e2d8b1e/src/type/definition.js#L425-L446
            field.type = new LimitedLengthType(field.type, this.args.max);
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

      directiveVisitors: {
        uniqueID: class extends SchemaDirectiveVisitor {
          public visitObject(type: GraphQLObjectType) {
            const { name, from } = this.args;
            type.getFields()[name] = {
              name: name,
              type: GraphQLID,
              description: 'Unique ID',
              args: [],
              resolve(object) {
                const hash = require('crypto').createHash('sha1');
                hash.update(type.name);
                from.forEach((fieldName: string) => {
                  hash.update(String(object[fieldName]));
                });
                return hash.digest('hex');
              }
            };
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
});
