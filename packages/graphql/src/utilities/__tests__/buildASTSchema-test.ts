import { dedent } from '../../__testUtils__/dedent.js';

import type { Maybe } from '../../jsutils/Maybe.js';

import type { ASTNode } from '../../language/ast.js';
import { Kind } from '../../language/kinds.js';
import { parse } from '../../language/parser.js';
import { print } from '../../language/printer.js';

import {
  assertEnumType,
  assertInputObjectType,
  assertInterfaceType,
  assertObjectType,
  assertScalarType,
  assertUnionType,
} from '../../type/definition.js';
import {
  assertDirective,
  GraphQLDeprecatedDirective,
  GraphQLIncludeDirective,
  GraphQLSkipDirective,
  GraphQLSpecifiedByDirective,
} from '../../type/directives.js';
import { __EnumValue, __Schema } from '../../type/introspection.js';
import { GraphQLBoolean, GraphQLFloat, GraphQLID, GraphQLInt, GraphQLString } from '../../type/scalars.js';
import { GraphQLSchema } from '../../type/schema.js';
import { validateSchema } from '../../type/validate.js';

import { graphqlSync } from '../../graphql.js';

import { buildASTSchema, buildSchema } from '../buildASTSchema.js';
import { printSchema, printType } from '../printSchema.js';

/**
 * This function does a full cycle of going from a string with the contents of
 * the SDL, parsed in a schema AST, materializing that schema AST into an
 * in-memory GraphQLSchema, and then finally printing that object into the SDL
 */
function cycleSDL(sdl: string): string {
  return printSchema(buildSchema(sdl));
}

function expectASTNode(obj: Maybe<{ readonly astNode: Maybe<ASTNode> }>) {
  expect(obj?.astNode != null).toBeTruthy();
  // @ts-expect-error
  return expect(print(obj.astNode));
}

function expectExtensionASTNodes(obj: { readonly extensionASTNodes: ReadonlyArray<ASTNode> }) {
  return expect(obj.extensionASTNodes.map(print).join('\n\n'));
}

describe('Schema Builder', () => {
  it('can use built schema for limited execution', () => {
    const schema = buildASTSchema(
      parse(`
        type Query {
          str: String
        }
      `)
    );

    const result = graphqlSync({
      schema,
      source: '{ str }',
      rootValue: { str: 123 },
    });
    expect(result.data).toEqual({ str: '123' });
  });

  it('can build a schema directly from the source', () => {
    const schema = buildSchema(`
      type Query {
        add(x: Int, y: Int): Int
      }
    `);

    const source = '{ add(x: 34, y: 55) }';
    const rootValue = {
      add: ({ x, y }: { x: number; y: number }) => x + y,
    };
    expect(graphqlSync({ schema, source, rootValue })).toEqual({
      data: { add: 89 },
    });
  });

  it('Ignores non-type system definitions', () => {
    const sdl = `
      type Query {
        str: String
      }

      fragment SomeFragment on Query {
        str
      }
    `;
    expect(() => buildSchema(sdl)).not.toThrow();
  });

  it('Match order of default types and directives', () => {
    const schema = new GraphQLSchema({});
    const sdlSchema = buildASTSchema({
      kind: Kind.DOCUMENT,
      definitions: [],
    });

    expect(sdlSchema.getDirectives()).toEqual(schema.getDirectives());

    expect(sdlSchema.getTypeMap()).toEqual(schema.getTypeMap());
    expect(Object.keys(sdlSchema.getTypeMap())).toEqual(Object.keys(schema.getTypeMap()));
  });

  it('Empty type', () => {
    const sdl = dedent`
      type EmptyType
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Simple type', () => {
    const sdl = dedent`
      type Query {
        str: String
        int: Int
        float: Float
        id: ID
        bool: Boolean
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);

    const schema = buildSchema(sdl);
    // Built-ins are used
    expect(schema.getType('Int')).toEqual(GraphQLInt);
    expect(schema.getType('Float')).toEqual(GraphQLFloat);
    expect(schema.getType('String')).toEqual(GraphQLString);
    expect(schema.getType('Boolean')).toEqual(GraphQLBoolean);
    expect(schema.getType('ID')).toEqual(GraphQLID);
  });

  it('include standard type only if it is used', () => {
    const schema = buildSchema('type Query');

    // String and Boolean are always included through introspection types
    expect(schema.getType('Int')).toEqual(undefined);
    expect(schema.getType('Float')).toEqual(undefined);
    expect(schema.getType('ID')).toEqual(undefined);
  });

  it('With directives', () => {
    const sdl = dedent`
      directive @foo(arg: Int) on FIELD

      directive @repeatableFoo(arg: Int) repeatable on FIELD
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Supports descriptions', () => {
    const sdl = dedent`
      """Do you agree that this is the most creative schema ever?"""
      schema {
        query: Query
      }

      """This is a directive"""
      directive @foo(
        """It has an argument"""
        arg: Int
      ) on FIELD

      """Who knows what inside this scalar?"""
      scalar MysteryScalar

      """This is a input object type"""
      input FooInput {
        """It has a field"""
        field: Int
      }

      """This is a interface type"""
      interface Energy {
        """It also has a field"""
        str: String
      }

      """There is nothing inside!"""
      union BlackHole

      """With an enum"""
      enum Color {
        RED

        """Not a creative color"""
        GREEN
        BLUE
      }

      """What a great type"""
      type Query {
        """And a field to boot"""
        str: String
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Maintains @include, @skip & @specifiedBy', () => {
    const schema = buildSchema('type Query');

    expect(schema.getDirectives()).toHaveLength(4);
    expect(schema.getDirective('skip')).toEqual(GraphQLSkipDirective);
    expect(schema.getDirective('include')).toEqual(GraphQLIncludeDirective);
    expect(schema.getDirective('deprecated')).toEqual(GraphQLDeprecatedDirective);
    expect(schema.getDirective('specifiedBy')).toEqual(GraphQLSpecifiedByDirective);
  });

  it('Overriding directives excludes specified', () => {
    const schema = buildSchema(`
      directive @skip on FIELD
      directive @include on FIELD
      directive @deprecated on FIELD_DEFINITION
      directive @specifiedBy on FIELD_DEFINITION
    `);

    expect(schema.getDirectives()).toHaveLength(4);
    expect(schema.getDirective('skip')).not.toEqual(GraphQLSkipDirective);
    expect(schema.getDirective('include')).not.toEqual(GraphQLIncludeDirective);
    expect(schema.getDirective('deprecated')).not.toEqual(GraphQLDeprecatedDirective);
    expect(schema.getDirective('specifiedBy')).not.toEqual(GraphQLSpecifiedByDirective);
  });

  it('Adding directives maintains @include, @skip & @specifiedBy', () => {
    const schema = buildSchema(`
      directive @foo(arg: Int) on FIELD
    `);

    expect(schema.getDirectives()).toHaveLength(5);
    expect(schema.getDirective('skip')).not.toEqual(undefined);
    expect(schema.getDirective('include')).not.toEqual(undefined);
    expect(schema.getDirective('deprecated')).not.toEqual(undefined);
    expect(schema.getDirective('specifiedBy')).not.toEqual(undefined);
  });

  it('Type modifiers', () => {
    const sdl = dedent`
      type Query {
        nonNullStr: String!
        listOfStrings: [String]
        listOfNonNullStrings: [String!]
        nonNullListOfStrings: [String]!
        nonNullListOfNonNullStrings: [String!]!
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Recursive type', () => {
    const sdl = dedent`
      type Query {
        str: String
        recurse: Query
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Two types circular', () => {
    const sdl = dedent`
      type TypeOne {
        str: String
        typeTwo: TypeTwo
      }

      type TypeTwo {
        str: String
        typeOne: TypeOne
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Single argument field', () => {
    const sdl = dedent`
      type Query {
        str(int: Int): String
        floatToStr(float: Float): String
        idToStr(id: ID): String
        booleanToStr(bool: Boolean): String
        strToStr(bool: String): String
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Simple type with multiple arguments', () => {
    const sdl = dedent`
      type Query {
        str(int: Int, bool: Boolean): String
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Empty interface', () => {
    const sdl = dedent`
      interface EmptyInterface
    `;

    const definition = parse(sdl).definitions[0];
    expect(definition.kind === 'InterfaceTypeDefinition' && definition.interfaces).toEqual([]);

    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Simple type with interface', () => {
    const sdl = dedent`
      type Query implements WorldInterface {
        str: String
      }

      interface WorldInterface {
        str: String
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Simple interface hierarchy', () => {
    const sdl = dedent`
      schema {
        query: Child
      }

      interface Child implements Parent {
        str: String
      }

      type Hello implements Parent & Child {
        str: String
      }

      interface Parent {
        str: String
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Empty enum', () => {
    const sdl = dedent`
      enum EmptyEnum
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Simple output enum', () => {
    const sdl = dedent`
      enum Hello {
        WORLD
      }

      type Query {
        hello: Hello
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Simple input enum', () => {
    const sdl = dedent`
      enum Hello {
        WORLD
      }

      type Query {
        str(hello: Hello): String
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Multiple value enum', () => {
    const sdl = dedent`
      enum Hello {
        WO
        RLD
      }

      type Query {
        hello: Hello
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Empty union', () => {
    const sdl = dedent`
      union EmptyUnion
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Simple Union', () => {
    const sdl = dedent`
      union Hello = World

      type Query {
        hello: Hello
      }

      type World {
        str: String
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Multiple Union', () => {
    const sdl = dedent`
      union Hello = WorldOne | WorldTwo

      type Query {
        hello: Hello
      }

      type WorldOne {
        str: String
      }

      type WorldTwo {
        str: String
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Can build recursive Union', () => {
    const schema = buildSchema(`
      union Hello = Hello

      type Query {
        hello: Hello
      }
    `);
    const errors = validateSchema(schema);
    expect(errors.length > 0).toBeTruthy();
  });

  it('Custom Scalar', () => {
    const sdl = dedent`
      scalar CustomScalar

      type Query {
        customScalar: CustomScalar
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Empty Input Object', () => {
    const sdl = dedent`
      input EmptyInputObject
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Simple Input Object', () => {
    const sdl = dedent`
      input Input {
        int: Int
      }

      type Query {
        field(in: Input): String
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Simple argument field with default', () => {
    const sdl = dedent`
      type Query {
        str(int: Int = 2): String
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Custom scalar argument field with default', () => {
    const sdl = dedent`
      scalar CustomScalar

      type Query {
        str(int: CustomScalar = 2): String
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Simple type with mutation', () => {
    const sdl = dedent`
      schema {
        query: HelloScalars
        mutation: Mutation
      }

      type HelloScalars {
        str: String
        int: Int
        bool: Boolean
      }

      type Mutation {
        addHelloScalars(str: String, int: Int, bool: Boolean): HelloScalars
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Simple type with subscription', () => {
    const sdl = dedent`
      schema {
        query: HelloScalars
        subscription: Subscription
      }

      type HelloScalars {
        str: String
        int: Int
        bool: Boolean
      }

      type Subscription {
        subscribeHelloScalars(str: String, int: Int, bool: Boolean): HelloScalars
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Unreferenced type implementing referenced interface', () => {
    const sdl = dedent`
      type Concrete implements Interface {
        key: String
      }

      interface Interface {
        key: String
      }

      type Query {
        interface: Interface
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Unreferenced interface implementing referenced interface', () => {
    const sdl = dedent`
      interface Child implements Parent {
        key: String
      }

      interface Parent {
        key: String
      }

      type Query {
        interfaceField: Parent
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Unreferenced type implementing referenced union', () => {
    const sdl = dedent`
      type Concrete {
        key: String
      }

      type Query {
        union: Union
      }

      union Union = Concrete
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);
  });

  it('Supports @deprecated', () => {
    const sdl = dedent`
      enum MyEnum {
        VALUE
        OLD_VALUE @deprecated
        OTHER_VALUE @deprecated(reason: "Terrible reasons")
      }

      input MyInput {
        oldInput: String @deprecated
        otherInput: String @deprecated(reason: "Use newInput")
        newInput: String
      }

      type Query {
        field1: String @deprecated
        field2: Int @deprecated(reason: "Because I said so")
        enum: MyEnum
        field3(oldArg: String @deprecated, arg: String): String
        field4(oldArg: String @deprecated(reason: "Why not?"), arg: String): String
        field5(arg: MyInput): String
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);

    const schema = buildSchema(sdl);

    const myEnum = assertEnumType(schema.getType('MyEnum'));

    const value = myEnum.getValue('VALUE');
    expect(value).toMatchObject({ deprecationReason: undefined });

    const oldValue = myEnum.getValue('OLD_VALUE');
    expect(oldValue).toMatchObject({
      deprecationReason: 'No longer supported',
    });

    const otherValue = myEnum.getValue('OTHER_VALUE');
    expect(otherValue).toMatchObject({
      deprecationReason: 'Terrible reasons',
    });

    const rootFields = assertObjectType(schema.getType('Query')).getFields();
    expect(rootFields.field1).toMatchObject({
      deprecationReason: 'No longer supported',
    });
    expect(rootFields.field2).toMatchObject({
      deprecationReason: 'Because I said so',
    });

    const inputFields = assertInputObjectType(schema.getType('MyInput')).getFields();

    const newInput = inputFields.newInput;
    expect(newInput).toMatchObject({
      deprecationReason: undefined,
    });

    const oldInput = inputFields.oldInput;
    expect(oldInput).toMatchObject({
      deprecationReason: 'No longer supported',
    });

    const otherInput = inputFields.otherInput;
    expect(otherInput).toMatchObject({
      deprecationReason: 'Use newInput',
    });

    const field3OldArg = rootFields.field3.args[0];
    expect(field3OldArg).toMatchObject({
      deprecationReason: 'No longer supported',
    });

    const field4OldArg = rootFields.field4.args[0];
    expect(field4OldArg).toMatchObject({
      deprecationReason: 'Why not?',
    });
  });

  it('Supports @specifiedBy', () => {
    const sdl = dedent`
      scalar Foo @specifiedBy(url: "https://example.com/foo_spec")

      type Query {
        foo: Foo @deprecated
      }
    `;
    expect(cycleSDL(sdl)).toEqual(sdl);

    const schema = buildSchema(sdl);

    expect(schema.getType('Foo')).toMatchObject({
      specifiedByURL: 'https://example.com/foo_spec',
    });
  });

  it('Correctly extend scalar type', () => {
    const schema = buildSchema(`
      scalar SomeScalar
      extend scalar SomeScalar @foo
      extend scalar SomeScalar @bar

      directive @foo on SCALAR
      directive @bar on SCALAR
    `);

    const someScalar = assertScalarType(schema.getType('SomeScalar'));
    expect(printType(someScalar)).toEqual(dedent`
      scalar SomeScalar
    `);

    expectASTNode(someScalar).toEqual('scalar SomeScalar');
    expectExtensionASTNodes(someScalar).toEqual(dedent`
      extend scalar SomeScalar @foo

      extend scalar SomeScalar @bar
    `);
  });

  it('Correctly extend object type', () => {
    const schema = buildSchema(`
      type SomeObject implements Foo {
        first: String
      }

      extend type SomeObject implements Bar {
        second: Int
      }

      extend type SomeObject implements Baz {
        third: Float
      }

      interface Foo
      interface Bar
      interface Baz
    `);

    const someObject = assertObjectType(schema.getType('SomeObject'));
    expect(printType(someObject)).toEqual(dedent`
      type SomeObject implements Foo & Bar & Baz {
        first: String
        second: Int
        third: Float
      }
    `);

    expectASTNode(someObject).toEqual(dedent`
      type SomeObject implements Foo {
        first: String
      }
    `);
    expectExtensionASTNodes(someObject).toEqual(dedent`
      extend type SomeObject implements Bar {
        second: Int
      }

      extend type SomeObject implements Baz {
        third: Float
      }
    `);
  });

  it('Correctly extend interface type', () => {
    const schema = buildSchema(dedent`
      interface SomeInterface {
        first: String
      }

      extend interface SomeInterface {
        second: Int
      }

      extend interface SomeInterface {
        third: Float
      }
    `);

    const someInterface = assertInterfaceType(schema.getType('SomeInterface'));
    expect(printType(someInterface)).toEqual(dedent`
      interface SomeInterface {
        first: String
        second: Int
        third: Float
      }
    `);

    expectASTNode(someInterface).toEqual(dedent`
      interface SomeInterface {
        first: String
      }
    `);
    expectExtensionASTNodes(someInterface).toEqual(dedent`
      extend interface SomeInterface {
        second: Int
      }

      extend interface SomeInterface {
        third: Float
      }
    `);
  });

  it('Correctly extend union type', () => {
    const schema = buildSchema(`
      union SomeUnion = FirstType
      extend union SomeUnion = SecondType
      extend union SomeUnion = ThirdType

      type FirstType
      type SecondType
      type ThirdType
    `);

    const someUnion = assertUnionType(schema.getType('SomeUnion'));
    expect(printType(someUnion)).toEqual(dedent`
      union SomeUnion = FirstType | SecondType | ThirdType
    `);

    expectASTNode(someUnion).toEqual('union SomeUnion = FirstType');
    expectExtensionASTNodes(someUnion).toEqual(dedent`
      extend union SomeUnion = SecondType

      extend union SomeUnion = ThirdType
    `);
  });

  it('Correctly extend enum type', () => {
    const schema = buildSchema(dedent`
      enum SomeEnum {
        FIRST
      }

      extend enum SomeEnum {
        SECOND
      }

      extend enum SomeEnum {
        THIRD
      }
    `);

    const someEnum = assertEnumType(schema.getType('SomeEnum'));
    expect(printType(someEnum)).toEqual(dedent`
      enum SomeEnum {
        FIRST
        SECOND
        THIRD
      }
    `);

    expectASTNode(someEnum).toEqual(dedent`
      enum SomeEnum {
        FIRST
      }
    `);
    expectExtensionASTNodes(someEnum).toEqual(dedent`
      extend enum SomeEnum {
        SECOND
      }

      extend enum SomeEnum {
        THIRD
      }
    `);
  });

  it('Correctly extend input object type', () => {
    const schema = buildSchema(dedent`
      input SomeInput {
        first: String
      }

      extend input SomeInput {
        second: Int
      }

      extend input SomeInput {
        third: Float
      }
    `);

    const someInput = assertInputObjectType(schema.getType('SomeInput'));
    expect(printType(someInput)).toEqual(dedent`
      input SomeInput {
        first: String
        second: Int
        third: Float
      }
    `);

    expectASTNode(someInput).toEqual(dedent`
      input SomeInput {
        first: String
      }
    `);
    expectExtensionASTNodes(someInput).toEqual(dedent`
      extend input SomeInput {
        second: Int
      }

      extend input SomeInput {
        third: Float
      }
    `);
  });

  it('Correctly assign AST nodes', () => {
    const sdl = dedent`
      schema {
        query: Query
      }

      type Query {
        testField(testArg: TestInput): TestUnion
      }

      input TestInput {
        testInputField: TestEnum
      }

      enum TestEnum {
        TEST_VALUE
      }

      union TestUnion = TestType

      interface TestInterface {
        interfaceField: String
      }

      type TestType implements TestInterface {
        interfaceField: String
      }

      scalar TestScalar

      directive @test(arg: TestScalar) on FIELD
    `;
    const ast = parse(sdl, { noLocation: true });

    const schema = buildASTSchema(ast);
    const query = assertObjectType(schema.getType('Query'));
    const testInput = assertInputObjectType(schema.getType('TestInput'));
    const testEnum = assertEnumType(schema.getType('TestEnum'));
    const testUnion = assertUnionType(schema.getType('TestUnion'));
    const testInterface = assertInterfaceType(schema.getType('TestInterface'));
    const testType = assertObjectType(schema.getType('TestType'));
    const testScalar = assertScalarType(schema.getType('TestScalar'));
    const testDirective = assertDirective(schema.getDirective('test'));

    expect([
      schema.astNode,
      query.astNode,
      testInput.astNode,
      testEnum.astNode,
      testUnion.astNode,
      testInterface.astNode,
      testType.astNode,
      testScalar.astNode,
      testDirective.astNode,
    ]).toEqual(ast.definitions);

    const testField = query.getFields().testField;
    expectASTNode(testField).toEqual('testField(testArg: TestInput): TestUnion');
    expectASTNode(testField.args[0]).toEqual('testArg: TestInput');
    expectASTNode(testInput.getFields().testInputField).toEqual('testInputField: TestEnum');

    expectASTNode(testEnum.getValue('TEST_VALUE')).toEqual('TEST_VALUE');

    expectASTNode(testInterface.getFields().interfaceField).toEqual('interfaceField: String');
    expectASTNode(testType.getFields().interfaceField).toEqual('interfaceField: String');
    expectASTNode(testDirective.args[0]).toEqual('arg: TestScalar');
  });

  it('Root operation types with custom names', () => {
    const schema = buildSchema(`
      schema {
        query: SomeQuery
        mutation: SomeMutation
        subscription: SomeSubscription
      }
      type SomeQuery
      type SomeMutation
      type SomeSubscription
    `);

    expect(schema.getQueryType()).toMatchObject({ name: 'SomeQuery' });
    expect(schema.getMutationType()).toMatchObject({ name: 'SomeMutation' });
    expect(schema.getSubscriptionType()).toMatchObject({
      name: 'SomeSubscription',
    });
  });

  it('Default root operation type names', () => {
    const schema = buildSchema(`
      type Query
      type Mutation
      type Subscription
    `);

    expect(schema.getQueryType()).toMatchObject({ name: 'Query' });
    expect(schema.getMutationType()).toMatchObject({ name: 'Mutation' });
    expect(schema.getSubscriptionType()).toMatchObject({ name: 'Subscription' });
  });

  it('can build invalid schema', () => {
    // Invalid schema, because it is missing query root type
    const schema = buildSchema('type Mutation');
    const errors = validateSchema(schema);
    expect(errors.length > 0).toBeTruthy();
  });

  it('Do not override standard types', () => {
    // NOTE: not sure it's desired behavior to just silently ignore override
    // attempts so just documenting it here.

    const schema = buildSchema(`
      scalar ID

      scalar __Schema
    `);

    expect(schema.getType('ID')).toEqual(GraphQLID);
    expect(schema.getType('__Schema')).toEqual(__Schema);
  });

  it('Allows to reference introspection types', () => {
    const schema = buildSchema(`
      type Query {
        introspectionField: __EnumValue
      }
    `);

    const queryType = assertObjectType(schema.getType('Query'));
    expect(queryType.getFields()).toHaveProperty('introspectionField.type', __EnumValue);
    expect(schema.getType('__EnumValue')).toEqual(__EnumValue);
  });

  it('Rejects invalid SDL', () => {
    const sdl = `
      type Query {
        foo: String @unknown
      }
    `;
    expect(() => buildSchema(sdl)).toThrow('Unknown directive "@unknown".');
  });

  it('Allows to disable SDL validation', () => {
    const sdl = `
      type Query {
        foo: String @unknown
      }
    `;
    buildSchema(sdl, { assumeValid: true });
    buildSchema(sdl, { assumeValidSDL: true });
  });

  it('Throws on unknown types', () => {
    const sdl = `
      type Query {
        unknown: UnknownType
      }
    `;
    expect(() => buildSchema(sdl, { assumeValidSDL: true })).toThrow('Unknown type: "UnknownType".');
  });
});
