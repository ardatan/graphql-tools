import {
  GraphQLObjectType,
  GraphQLSchema,
  graphqlSync,
  buildSchema,
  getNamedType,
  defaultFieldResolver,
  graphql,
  GraphQLEnumType,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLInputFieldConfig,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLString,
  GraphQLUnionType,
  isListType,
  isNonNullType,
  isScalarType,
  printSchema,
} from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { MapperKind, mapSchema, getDirectives, getDirective, ExecutionResult } from '../src/index.js';
import { createHash } from 'crypto';
import { addMocksToSchema } from '@graphql-tools/mock';
import formatDate from 'dateformat';

describe('mapSchema', () => {
  test('does not throw', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        version: String
      }
    `);

    const newSchema = mapSchema(schema, {});
    expect(newSchema).toBeInstanceOf(GraphQLSchema);
  });

  test('can add a resolver', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        version: Int
      }
    `);

    const newSchema = mapSchema(schema, {
      [MapperKind.QUERY]: type => {
        const queryConfig = type.toConfig();
        queryConfig.fields['version'].resolve = () => 1;
        return new GraphQLObjectType(queryConfig);
      },
    });

    expect(newSchema).toBeInstanceOf(GraphQLSchema);

    const result = graphqlSync({
      schema: newSchema,
      source: /* GraphQL */ `
        {
          version
        }
      `,
    });
    expect(result.data?.['version']).toBe(1);
  });

  test('can change the root query name', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        version: Int
      }
    `);

    const newSchema = mapSchema(schema, {
      [MapperKind.QUERY]: type => {
        const queryConfig = type.toConfig();
        queryConfig.name = 'RootQuery';
        return new GraphQLObjectType(queryConfig);
      },
    });

    expect(newSchema).toBeInstanceOf(GraphQLSchema);
    expect(newSchema.getQueryType()?.name).toBe('RootQuery');
  });

  const typeDefs = /* GraphQL */ `
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
      addPerson(input: PersonInput @mutationArgumentDirective): Person @mutationMethodDirective
    }
    extend type Mutation @mutationTypeExtensionDirective
    type Person implements Named @objectTypeDirective {
      id: ID! @objectFieldDirective
      name: String!
    }
    extend type Person @objectTypeExtensionDirective
    union WhateverUnion @unionDirective = Person | Query | Mutation
    extend union WhateverUnion @unionExtensionDirective
  `;

  describe('@directives', () => {
    test('can be iterated with mapSchema', () => {
      const visited: Set<GraphQLObjectType> = new Set();

      function addObjectTypeToSetDirective(directiveNames: Array<string>): (schema: GraphQLSchema) => GraphQLSchema {
        return schema =>
          mapSchema(schema, {
            [MapperKind.OBJECT_TYPE]: type => {
              const directives = getDirectives(schema, type);
              for (const directive of directives) {
                if (directiveNames.includes(directive.name)) {
                  expect(type.name).toBe(schema.getQueryType()?.name);
                  visited.add(type);
                }
              }
              return undefined;
            },
          });
      }

      const schema = buildSchema(typeDefs);

      const transformer = addObjectTypeToSetDirective(['queryTypeDirective', 'queryTypeExtensionDirective']);
      transformer(schema);

      expect(visited.size).toBe(1);
    });

    test('can visit the schema directly', () => {
      const visited: Array<GraphQLSchema> = [];

      function recordSchemaDirectiveUses(directiveNames: Array<string>): (schema: GraphQLSchema) => GraphQLSchema {
        return schema => {
          const directives = getDirectives(schema, schema);
          for (const directive of directives) {
            if (directiveNames.includes(directive.name)) {
              visited.push(schema);
            }
          }
          return schema;
        };
      }

      let schema = makeExecutableSchema({ typeDefs });

      const transformer = recordSchemaDirectiveUses(['schemaDirective', 'schemaExtensionDirective']);
      schema = transformer(schema);

      const printedSchema = printSchema(makeExecutableSchema({ typeDefs }));
      expect(printSchema(schema)).toEqual(printedSchema);

      expect(visited.length).toBe(2);
      expect(printSchema(visited[0])).toEqual(printedSchema);
      expect(printSchema(visited[1])).toEqual(printedSchema);
    });

    test('can be used to implement the @upper example', () => {
      function upperDirective(directiveName: string) {
        return {
          upperDirectiveTypeDefs: `directive @${directiveName} on FIELD_DEFINITION`,
          upperDirectiveTransformer: (schema: GraphQLSchema) =>
            mapSchema(schema, {
              [MapperKind.OBJECT_FIELD]: fieldConfig => {
                const upperDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
                if (upperDirective) {
                  const { resolve = defaultFieldResolver } = fieldConfig;
                  fieldConfig.resolve = async function (source, args, context, info) {
                    const result = await resolve(source, args, context, info);
                    if (typeof result === 'string') {
                      return result.toUpperCase();
                    }
                    return result;
                  };
                  return fieldConfig;
                }
              },
            }),
        };
      }

      const { upperDirectiveTypeDefs, upperDirectiveTransformer } = upperDirective('upper');

      const schemaWithResolvers = makeExecutableSchema({
        typeDefs: [
          upperDirectiveTypeDefs,
          /* GraphQL */ `
            type Query {
              hello: String @upper
            }
          `,
        ],
        resolvers: {
          Query: {
            hello() {
              return 'hello world';
            },
          },
        },
      });

      const schema = upperDirectiveTransformer(schemaWithResolvers);

      return graphql({
        schema,
        source: /* GraphQL */ `
          query {
            hello
          }
        `,
      }).then(({ data }) => {
        expect(data).toEqual({
          hello: 'HELLO WORLD',
        });
      });
    });

    test('can be used to implement the @deprecated example', () => {
      function deprecatedDirective(directiveName: string) {
        return {
          deprecatedDirectiveTypeDefs: `directive @${directiveName}(reason: String) on FIELD_DEFINITION | ENUM_VALUE`,
          deprecatedDirectiveTransformer: (schema: GraphQLSchema) =>
            mapSchema(schema, {
              [MapperKind.OBJECT_FIELD]: fieldConfig => {
                const deprecatedDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
                if (deprecatedDirective) {
                  fieldConfig.deprecationReason = deprecatedDirective['reason'];
                  return fieldConfig;
                }
              },
              [MapperKind.ENUM_VALUE]: enumValueConfig => {
                const deprecatedDirective = getDirective(schema, enumValueConfig, directiveName)?.[0];
                if (deprecatedDirective) {
                  enumValueConfig.deprecationReason = deprecatedDirective['reason'];
                  return enumValueConfig;
                }
              },
            }),
        };
      }

      const { deprecatedDirectiveTypeDefs, deprecatedDirectiveTransformer } = deprecatedDirective('deprecated');

      const rawSchema = buildSchema(/* GraphQL */ `
        ${deprecatedDirectiveTypeDefs}
        type ExampleType {
          newField: String
          oldField: String @deprecated(reason: "Use \`newField\`.")
        }
        type Query {
          rootField: ExampleType
        }
      `);

      const schema = deprecatedDirectiveTransformer(rawSchema);

      expect((schema.getType('ExampleType') as GraphQLObjectType).getFields()['oldField'].deprecationReason).toBe(
        'Use `newField`.'
      );
    });

    test('can be used to implement the @date example', () => {
      function dateDirective(directiveName: string) {
        return {
          dateDirectiveTypeDefs: `directive @${directiveName}(format: String) on FIELD_DEFINITION`,
          dateDirectiveTransformer: (schema: GraphQLSchema) =>
            mapSchema(schema, {
              [MapperKind.OBJECT_FIELD]: fieldConfig => {
                const dateDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
                if (dateDirective) {
                  const { resolve = defaultFieldResolver } = fieldConfig;
                  const { format } = dateDirective;
                  fieldConfig.resolve = async (source, args, context, info) => {
                    const date: any = await resolve(source, args, context, info);
                    return formatDate(date, format, true);
                  };
                  return fieldConfig;
                }
              },
            }),
        };
      }

      const { dateDirectiveTypeDefs, dateDirectiveTransformer } = dateDirective('date');

      const rawSchema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          ${dateDirectiveTypeDefs}
          scalar Date
          type Query {
            today: Date @date(format: "mmmm d, yyyy")
          }
        `,
        resolvers: {
          Query: {
            today() {
              return new Date(1519688273858).toUTCString();
            },
          },
        },
      });
      const schema = dateDirectiveTransformer(rawSchema);

      return graphql({
        schema,
        source: /* GraphQL */ `
          query {
            today
          }
        `,
      }).then(({ data }) => {
        expect(data).toEqual({
          today: 'February 26, 2018',
        });
      });
    });

    test('can be used to implement the @date by adding an argument', async () => {
      function formattableDateDirective(directiveName: string) {
        return {
          formattableDateDirectiveTypeDefs: `directive @${directiveName}(
            defaultFormat: String = "mmmm d, yyyy"
          ) on FIELD_DEFINITION
        `,
          formattableDateDirectiveTransformer: (schema: GraphQLSchema) =>
            mapSchema(schema, {
              [MapperKind.OBJECT_FIELD]: fieldConfig => {
                const dateDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
                if (dateDirective) {
                  const { resolve = defaultFieldResolver } = fieldConfig;
                  const { defaultFormat } = dateDirective;

                  if (!fieldConfig.args) {
                    throw new Error('Unexpected Error. args should be defined.');
                  }

                  fieldConfig.args['format'] = {
                    type: GraphQLString,
                  };

                  fieldConfig.type = GraphQLString;
                  fieldConfig.resolve = async (source, { format, ...args }, context, info) => {
                    const newFormat = format || defaultFormat;
                    const date: any = await resolve(source, args, context, info);
                    return formatDate(date, newFormat, true);
                  };
                  return fieldConfig;
                }
              },
            }),
        };
      }

      const { formattableDateDirectiveTypeDefs, formattableDateDirectiveTransformer } =
        formattableDateDirective('date');

      const rawSchema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          ${formattableDateDirectiveTypeDefs}
          scalar Date
          type Query {
            today: Date @date
          }
        `,
        resolvers: {
          Query: {
            today() {
              return new Date(1521131357195);
            },
          },
        },
      });

      const schema = formattableDateDirectiveTransformer(rawSchema);

      const resultNoArg = await graphql({ schema, source: 'query { today }' });

      if (resultNoArg.errors != null) {
        expect(resultNoArg.errors).toEqual([]);
      }

      expect(resultNoArg.data).toEqual({ today: 'March 15, 2018' });

      const resultWithArg = await graphql({
        schema,
        source: `
        query {
          today(format: "dd mmm yyyy")
        }
      `,
      });

      if (resultWithArg.errors != null) {
        expect(resultWithArg.errors).toEqual([]);
      }

      expect(resultWithArg.data).toEqual({ today: '15 Mar 2018' });
    });

    test('can be used to implement the @auth example', async () => {
      function authDirective(
        directiveName: string,
        getUserFn: (token: string) => { hasRole: (role: string) => boolean }
      ) {
        const typeDirectiveArgumentMaps: Record<string, any> = {};
        return {
          authDirectiveTypeDefs: `directive @${directiveName}(
          requires: Role = ADMIN,
        ) on OBJECT | FIELD_DEFINITION
        enum Role {
          ADMIN
          REVIEWER
          USER
          UNKNOWN
        }`,
          authDirectiveTransformer: (schema: GraphQLSchema) =>
            mapSchema(schema, {
              [MapperKind.TYPE]: type => {
                const authDirective = getDirective(schema, type, directiveName)?.[0];
                if (authDirective) {
                  typeDirectiveArgumentMaps[type.name] = authDirective;
                }
                return undefined;
              },
              [MapperKind.OBJECT_FIELD]: (fieldConfig, _fieldName, typeName) => {
                const authDirective =
                  getDirective(schema, fieldConfig, directiveName)?.[0] ?? typeDirectiveArgumentMaps[typeName];
                if (authDirective) {
                  const { requires } = authDirective;
                  if (requires) {
                    const { resolve = defaultFieldResolver } = fieldConfig;
                    fieldConfig.resolve = function (source, args, context, info) {
                      const user = getUserFn(context.headers.authToken);
                      if (!user.hasRole(requires)) {
                        throw new Error('not authorized');
                      }
                      return resolve(source, args, context, info);
                    };
                    return fieldConfig;
                  }
                }
              },
            }),
        };
      }

      function getUser(token: string) {
        const roles = ['UNKNOWN', 'USER', 'REVIEWER', 'ADMIN'];
        return {
          hasRole: (role: string) => {
            const tokenIndex = roles.indexOf(token);
            const roleIndex = roles.indexOf(role);
            return roleIndex >= 0 && tokenIndex >= roleIndex;
          },
        };
      }

      const { authDirectiveTypeDefs, authDirectiveTransformer } = authDirective('auth', getUser);

      const rawSchema = makeExecutableSchema({
        typeDefs: [
          authDirectiveTypeDefs,
          /* GraphQL */ `
            type User @auth(requires: USER) {
              name: String
              banned: Boolean @auth(requires: ADMIN)
              canPost: Boolean @auth(requires: REVIEWER)
            }
            type Query {
              users: [User]
            }
          `,
        ],
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
      const schema = authDirectiveTransformer(rawSchema);

      function execWithRole(role: string): Promise<ExecutionResult> {
        return graphql({
          schema,
          source: /* GraphQL */ `
            query {
              users {
                name
                banned
                canPost
              }
            }
          `,
          contextValue: {
            headers: {
              authToken: role,
            },
          },
        });
      }

      function assertStringArray(input: Array<unknown>): asserts input is Array<string> {
        if (input.some(item => typeof item !== 'string')) {
          throw new Error('All items in array should be strings.');
        }
      }

      function checkErrors(expectedCount: number, ...expectedNames: Array<string>) {
        return function ({ errors = [], data }: ExecutionResult) {
          expect(errors.length).toBe(expectedCount);
          expect(errors.every(error => error.message === 'not authorized')).toBeTruthy();
          const actualNames = errors.map(error => error.path!.slice(-1)[0]);
          assertStringArray(actualNames);
          expect(expectedNames.sort((a, b) => a.localeCompare(b))).toEqual(
            actualNames.sort((a, b) => a.localeCompare(b))
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
          .then(data => {
            const usersData: any = data?.['users'];
            expect(usersData?.length).toBe(1);
            expect(usersData?.[0].banned).toBe(true);
            expect(usersData?.[0].canPost).toBe(false);
            expect(usersData?.[0].name).toBe('Ben');
          }),
      ]);
    });

    test('can be used to implement the @length example', async () => {
      function lengthDirective(directiveName: string) {
        class LimitedLengthType extends GraphQLScalarType {
          constructor(type: GraphQLScalarType, maxLength: number) {
            super({
              name: `${type.name}WithLengthAtMost${maxLength.toString()}`,

              serialize(value) {
                const newValue = type.serialize(value) as string;
                expect(typeof newValue.length).toBe('number');
                if (newValue.length > maxLength) {
                  throw new Error(`expected ${newValue.length.toString(10)} to be at most ${maxLength.toString(10)}`);
                }
                return newValue;
              },

              parseValue(value) {
                return type.parseValue(value) as string;
              },

              parseLiteral(ast) {
                return type.parseLiteral(ast, {});
              },
            });
          }
        }

        const limitedLengthTypes: Record<string, Record<number, GraphQLScalarType>> = {};

        function getLimitedLengthType(type: GraphQLScalarType, maxLength: number): GraphQLScalarType {
          const limitedLengthTypesByTypeName = limitedLengthTypes[type.name];
          if (!limitedLengthTypesByTypeName) {
            const newType = new LimitedLengthType(type, maxLength);
            limitedLengthTypes[type.name] = {};
            limitedLengthTypes[type.name][maxLength] = newType;
            return newType;
          }

          const limitedLengthType = limitedLengthTypesByTypeName[maxLength];
          if (!limitedLengthType) {
            const newType = new LimitedLengthType(type, maxLength);
            limitedLengthTypesByTypeName[maxLength] = newType;
            return newType;
          }

          return limitedLengthType;
        }

        function wrapType<F extends GraphQLFieldConfig<any, any> | GraphQLInputFieldConfig>(
          fieldConfig: F,
          directiveArgumentMap: Record<string, any>
        ): void {
          if (isNonNullType(fieldConfig.type) && isScalarType(fieldConfig.type.ofType)) {
            fieldConfig.type = getLimitedLengthType(fieldConfig.type.ofType, directiveArgumentMap['max']);
          } else if (isScalarType(fieldConfig.type)) {
            fieldConfig.type = getLimitedLengthType(fieldConfig.type, directiveArgumentMap['max']);
          } else {
            throw new Error(`Not a scalar type: ${fieldConfig.type.toString()}`);
          }
        }

        return {
          lengthDirectiveTypeDefs: `directive @${directiveName}(max: Int) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION`,
          lengthDirectiveTransformer: (schema: GraphQLSchema) =>
            mapSchema(schema, {
              [MapperKind.FIELD]: fieldConfig => {
                const lengthDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
                if (lengthDirective) {
                  wrapType(fieldConfig, lengthDirective);
                  return fieldConfig;
                }
              },
            }),
        };
      }

      const { lengthDirectiveTypeDefs, lengthDirectiveTransformer } = lengthDirective('length');

      const rawSchema = makeExecutableSchema({
        typeDefs: [
          lengthDirectiveTypeDefs,
          `
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
        ],
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
      const schema = lengthDirectiveTransformer(rawSchema);

      const { errors } = await graphql({
        schema,
        source: `
        query {
          books {
            title
          }
        }
      `,
      });
      expect(errors?.length).toBe(1);
      expect(errors?.[0].message).toBe('expected 26 to be at most 10');

      const result = await graphql({
        schema,
        source: `
        mutation {
          createBook(book: { title: "safe title" }) {
            title
          }
        }
      `,
      });

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
      function uniqueIDDirective(directiveName: string) {
        return {
          uniqueIDDirectiveTypeDefs: `directive @${directiveName}(name: String, from: [String]) on OBJECT`,
          uniqueIDDirectiveTransformer: (schema: GraphQLSchema) =>
            mapSchema(schema, {
              [MapperKind.OBJECT_TYPE]: type => {
                const uniqueIDDirective = getDirective(schema, type, directiveName)?.[0];
                if (uniqueIDDirective) {
                  const { name, from } = uniqueIDDirective;
                  const config = type.toConfig();
                  config.fields[name] = {
                    type: GraphQLID,
                    description: 'Unique ID',
                    args: {},
                    resolve(object: any) {
                      const hash = createHash('sha1');
                      hash.update(type.name);
                      for (const fieldName of from) {
                        hash.update(String(object[fieldName]));
                      }
                      return hash.digest('hex');
                    },
                  };
                  return new GraphQLObjectType(config);
                }
              },
            }),
        };
      }

      const { uniqueIDDirectiveTypeDefs, uniqueIDDirectiveTransformer } = uniqueIDDirective('uniqueID');

      const rawSchema = makeExecutableSchema({
        typeDefs: [
          uniqueIDDirectiveTypeDefs,
          `
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
        }
      `,
        ],
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
      const schema = uniqueIDDirectiveTransformer(rawSchema);

      return graphql({
        schema,
        source: `
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
      }).then(result => {
        const { data } = result;

        expect(data?.['people']).toEqual([
          {
            uid: '580a207c8e94f03b93a2b01217c3cc218490571a',
            personID: 1,
            name: 'Ben',
          },
        ]);

        expect(data?.['locations']).toEqual([
          {
            uid: 'c31b71e6e23a7ae527f94341da333590dd7cba96',
            locationID: 1,
            address: '140 10th St',
          },
        ]);
      });
    });

    test('automatically updates references to changed types', () => {
      function renameObjectTypeToHumanDirective(directiveName: string): (schema: GraphQLSchema) => GraphQLSchema {
        return schema =>
          mapSchema(schema, {
            [MapperKind.OBJECT_TYPE]: type => {
              const directive = getDirective(schema, type, directiveName)?.[0];
              if (directive) {
                const config = type.toConfig();
                config.name = 'Human';
                return new GraphQLObjectType(config);
              }
            },
          });
      }

      const rawSchema = buildSchema(typeDefs);
      const schema = renameObjectTypeToHumanDirective('objectTypeDirective')(rawSchema);

      const Query = schema.getType('Query') as GraphQLObjectType;
      const peopleType = Query.getFields()['people'].type;
      if (isListType(peopleType)) {
        expect(peopleType.ofType).toBe(schema.getType('Human'));
      } else {
        throw new Error('Query.people not a GraphQLList type');
      }

      const Mutation = schema.getType('Mutation') as GraphQLObjectType;
      const addPersonResultType = Mutation.getFields()['addPerson'].type;
      expect(addPersonResultType).toBe(schema.getType('Human') as GraphQLOutputType);

      const WhateverUnion = schema.getType('WhateverUnion') as GraphQLUnionType;
      const found = WhateverUnion.getTypes().some(type => {
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
      function removeEnumValueDirective(directiveName: string): (schema: GraphQLSchema) => GraphQLSchema {
        return schema =>
          mapSchema(schema, {
            [MapperKind.ENUM_VALUE]: enumValueConfig => {
              const directive = getDirective(schema, enumValueConfig, directiveName)?.[0];
              if (directive?.['if']) {
                return null;
              }
            },
          });
      }

      const rawSchema = buildSchema(/* GraphQL */ `
        directive @remove(if: Boolean) on ENUM_VALUE
        type Query {
          age(unit: AgeUnit): Int
        }
        enum AgeUnit {
          DOG_YEARS
          TURTLE_YEARS @remove(if: true)
          PERSON_YEARS @remove(if: false)
        }
      `);
      const schema = removeEnumValueDirective('remove')(rawSchema);

      const AgeUnit = schema.getType('AgeUnit') as GraphQLEnumType;
      expect(AgeUnit.getValues().map(value => value.name)).toEqual(['DOG_YEARS', 'PERSON_YEARS']);
    });

    test("can modify enum value's external value", () => {
      function modifyExternalEnumValueDirective(directiveName: string): (schema: GraphQLSchema) => GraphQLSchema {
        return schema =>
          mapSchema(schema, {
            [MapperKind.ENUM_VALUE]: enumValueConfig => {
              const directive = getDirective(schema, enumValueConfig, directiveName)?.[0];
              if (directive) {
                return [directive['new'], enumValueConfig];
              }
            },
          });
      }

      const rawSchema = buildSchema(/* GraphQL */ `
        directive @value(new: String!) on ENUM_VALUE
        type Query {
          device: Device
        }
        enum Device {
          PHONE
          TABLET
          LAPTOP @value(new: "COMPUTER")
        }
      `);

      const schema = modifyExternalEnumValueDirective('value')(rawSchema);

      const Device = schema.getType('Device') as GraphQLEnumType;
      expect(Device.getValues().map(value => value.name)).toEqual(['PHONE', 'TABLET', 'COMPUTER']);
    });

    test("can modify enum value's internal value", () => {
      function modifyInternalEnumValueDirective(directiveName: string): (schema: GraphQLSchema) => GraphQLSchema {
        return schema =>
          mapSchema(schema, {
            [MapperKind.ENUM_VALUE]: enumValueConfig => {
              const directive = getDirective(schema, enumValueConfig, directiveName)?.[0];
              if (directive) {
                enumValueConfig.value = directive['new'];
                return enumValueConfig;
              }
            },
          });
      }

      const rawSchema = buildSchema(/* GraphQL */ `
        directive @value(new: String!) on ENUM_VALUE
        type Query {
          device: Device
        }
        enum Device {
          PHONE
          TABLET
          LAPTOP @value(new: "COMPUTER")
        }
      `);
      const schema = modifyInternalEnumValueDirective('value')(rawSchema);

      const Device = schema.getType('Device') as GraphQLEnumType;
      expect(Device.getValues().map(value => value.value)).toEqual(['PHONE', 'TABLET', 'COMPUTER']);
    });

    test('can swap names of GraphQLNamedType objects', () => {
      function renameObjectTypeDirective(directiveName: string): (schema: GraphQLSchema) => GraphQLSchema {
        return schema =>
          mapSchema(schema, {
            [MapperKind.OBJECT_TYPE]: type => {
              const directive = getDirective(schema, type, directiveName)?.[0];
              if (directive) {
                const config = type.toConfig();
                config.name = directive['to'];
                return new GraphQLObjectType(config);
              }
            },
          });
      }

      const rawSchema = buildSchema(/* GraphQL */ `
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
        }
      `);

      const schema = renameObjectTypeDirective('rename')(rawSchema);

      const Human = schema.getType('Human') as GraphQLObjectType;
      expect(Human.name).toBe('Human');
      expect(Human.getFields()['heightInInches'].type).toBe(GraphQLInt);

      const Person = schema.getType('Person') as GraphQLObjectType;
      expect(Person.name).toBe('Person');
      expect(Person.getFields()['born'].type).toBe(schema.getType('Date') as GraphQLScalarType);

      const Query = schema.getType('Query') as GraphQLObjectType;
      const peopleType = Query.getFields()['people'].type as GraphQLList<GraphQLObjectType>;
      expect(peopleType.ofType).toBe(Human);
    });

    test('does not enforce query directive locations (issue #680)', () => {
      function addObjectTypeToSetDirective(directiveName: string): (schema: GraphQLSchema) => GraphQLSchema {
        return schema =>
          mapSchema(schema, {
            [MapperKind.OBJECT_TYPE]: type => {
              const directive = getDirective(schema, type, directiveName)?.[0];
              if (directive) {
                expect(type.name).toBe(schema.getQueryType()?.name);
                visited.add(type);
              }
              return undefined;
            },
          });
      }

      const visited = new Set<GraphQLObjectType>();

      const schema = buildSchema(/* GraphQL */ `
        directive @hasScope(scope: [String]) on QUERY | FIELD | OBJECT
        type Query @hasScope {
          oyez: String
        }
      `);

      const transformer = addObjectTypeToSetDirective('hasScope');
      transformer(schema);

      expect(visited.size).toBe(1);
    });

    test('allows multiple directives when first replaces type (issue #851)', () => {
      function upperDirective(directiveName: string): (schema: GraphQLSchema) => GraphQLSchema {
        return schema =>
          mapSchema(schema, {
            [MapperKind.OBJECT_FIELD]: fieldConfig => {
              const upperDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
              if (upperDirective) {
                const { resolve = defaultFieldResolver } = fieldConfig;
                fieldConfig.resolve = async function (source, args, context, info) {
                  const result = await resolve(source, args, context, info);
                  if (typeof result === 'string') {
                    return result.toUpperCase();
                  }
                  return result;
                };
                return fieldConfig;
              }
            },
          });
      }

      function reverseDirective(directiveName: string): (schema: GraphQLSchema) => GraphQLSchema {
        return schema =>
          mapSchema(schema, {
            [MapperKind.OBJECT_FIELD]: fieldConfig => {
              const reverseDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
              if (reverseDirective) {
                const { resolve = defaultFieldResolver } = fieldConfig;
                fieldConfig.resolve = async function (source, args, context, info) {
                  const result = await resolve(source, args, context, info);
                  if (typeof result === 'string') {
                    return result.split('').reverse().join('');
                  }
                  return result;
                };
                return fieldConfig;
              }
            },
          });
      }

      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          directive @upper on FIELD_DEFINITION
          directive @reverse on FIELD_DEFINITION
          type Query {
            hello: String @upper @reverse
          }
        `,
        resolvers: {
          Query: {
            hello() {
              return 'hello world';
            },
          },
        },
      });

      const transformers = [upperDirective('upper'), reverseDirective('reverse')];

      const transformedSchema = transformers.reduce((acc, curr) => curr(acc), schema);

      return graphql({
        schema: transformedSchema,
        source: `
        query {
          hello
        }
      `,
      }).then(({ data }) => {
        expect(data).toEqual({
          hello: 'DLROW OLLEH',
        });
      });
    });

    test('allows creation of types that reference other types (issue #1877)', async () => {
      function listWrapperTransformer(schema: GraphQLSchema) {
        const listWrapperTypes = new Map();
        return mapSchema(schema, {
          [MapperKind.COMPOSITE_FIELD]: (fieldConfig, fieldName) => {
            const directive = getDirective(schema, fieldConfig, 'addListWrapper')?.[0];

            // Leave the field untouched if it does not have the directive annotation
            if (!directive) {
              return undefined;
            }

            const itemTypeInList = getNamedType(fieldConfig.type);
            const itemTypeNameInList = itemTypeInList.name;

            // 1. Creating the XListWrapper type and replace the type of the field with that
            if (!listWrapperTypes.has(itemTypeNameInList)) {
              listWrapperTypes.set(
                itemTypeNameInList,
                new GraphQLObjectType({
                  name: `${itemTypeNameInList}ListWrapper`,
                  fields: {
                    // Adding `size` field
                    size: {
                      type: new GraphQLNonNull(GraphQLInt),
                      description: 'The number of items in the `items` field',
                    },
                    // Creating a new List which contains the same type than the original List
                    items: {
                      type: new GraphQLNonNull(new GraphQLList(itemTypeInList)),
                    },
                  },
                })
              );
            }

            fieldConfig.type = listWrapperTypes.get(itemTypeNameInList);

            // 2. Replacing resolver to return `{ size, items }`
            const originalResolver = fieldConfig.resolve;

            fieldConfig.resolve = (parent, args, ctx, info) => {
              const value = originalResolver ? originalResolver(parent, args, ctx, info) : parent[fieldName];
              const items = value || [];

              return {
                size: items.length,
                items,
              };
            };

            // 3. Returning the updated `fieldConfig`
            return fieldConfig;
          },
        });
      }

      let schema = buildSchema(/* GraphQL */ `
        directive @addListWrapper on FIELD_DEFINITION
        type Query {
          me: Person
        }
        type Person {
          name: String!
          friends: [Person] @addListWrapper
        }
      `);

      schema = listWrapperTransformer(schema);

      schema = addMocksToSchema({ schema });

      const result = await graphql({
        schema,
        source: `
        query {
          me {
            friends {
              items {
                name
              }
            }
          }
        }
      `,
      });

      const expectedResult = {
        me: {
          friends: {
            items: [
              {
                name: 'Hello World',
              },
              {
                name: 'Hello World',
              },
            ],
          },
        },
      };

      expect(result.data).toEqual(expectedResult);
    });
  });
});
