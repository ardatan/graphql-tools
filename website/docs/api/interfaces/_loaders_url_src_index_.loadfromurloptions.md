---
id: "_loaders_url_src_index_.loadfromurloptions"
title: "LoadFromUrlOptions"
sidebar_label: "LoadFromUrlOptions"
---

Additional options for loading from a URL

## Hierarchy

* ParseOptions & GraphQLSchemaValidationOptions & BuildSchemaOptions & object

* object

  ↳ **LoadFromUrlOptions**

  ↳ [PrismaLoaderOptions](_loaders_prisma_src_index_.prismaloaderoptions)

## Index

### Properties

* [allowLegacySDLEmptyFields](_loaders_url_src_index_.loadfromurloptions.md#optional-allowlegacysdlemptyfields)
* [allowLegacySDLImplementsInterfaces](_loaders_url_src_index_.loadfromurloptions.md#optional-allowlegacysdlimplementsinterfaces)
* [assumeValid](_loaders_url_src_index_.loadfromurloptions.md#optional-assumevalid)
* [assumeValidSDL](_loaders_url_src_index_.loadfromurloptions.md#optional-assumevalidsdl)
* [commentDescriptions](_loaders_url_src_index_.loadfromurloptions.md#optional-commentdescriptions)
* [customFetch](_loaders_url_src_index_.loadfromurloptions.md#optional-customfetch)
* [cwd](_loaders_url_src_index_.loadfromurloptions.md#optional-cwd)
* [enableSubscriptions](_loaders_url_src_index_.loadfromurloptions.md#optional-enablesubscriptions)
* [experimentalFragmentVariables](_loaders_url_src_index_.loadfromurloptions.md#optional-experimentalfragmentvariables)
* [headers](_loaders_url_src_index_.loadfromurloptions.md#optional-headers)
* [method](_loaders_url_src_index_.loadfromurloptions.md#optional-method)
* [noLocation](_loaders_url_src_index_.loadfromurloptions.md#optional-nolocation)
* [useGETForQueries](_loaders_url_src_index_.loadfromurloptions.md#optional-usegetforqueries)
* [webSocketImpl](_loaders_url_src_index_.loadfromurloptions.md#optional-websocketimpl)

## Properties

### `Optional` allowLegacySDLEmptyFields

• **allowLegacySDLEmptyFields**? : *boolean*

*Inherited from [GraphQLFileLoaderOptions](_loaders_graphql_file_src_index_.graphqlfileloaderoptions).[allowLegacySDLEmptyFields](_loaders_graphql_file_src_index_.graphqlfileloaderoptions.md#optional-allowlegacysdlemptyfields)*

Defined in node_modules/graphql/language/parser.d.ts:23

If enabled, the parser will parse empty fields sets in the Schema
Definition Language. Otherwise, the parser will follow the current
specification.

This option is provided to ease adoption of the final SDL specification
and will be removed in v16.

___

### `Optional` allowLegacySDLImplementsInterfaces

• **allowLegacySDLImplementsInterfaces**? : *boolean*

*Inherited from [GraphQLFileLoaderOptions](_loaders_graphql_file_src_index_.graphqlfileloaderoptions).[allowLegacySDLImplementsInterfaces](_loaders_graphql_file_src_index_.graphqlfileloaderoptions.md#optional-allowlegacysdlimplementsinterfaces)*

Defined in node_modules/graphql/language/parser.d.ts:33

If enabled, the parser will parse implemented interfaces with no `&`
character between each interface. Otherwise, the parser will follow the
current specification.

This option is provided to ease adoption of the final SDL specification
and will be removed in v16.

___

### `Optional` assumeValid

• **assumeValid**? : *boolean*

*Inherited from [MergeSchemasConfig](_merge_src_index_.mergeschemasconfig).[assumeValid](_merge_src_index_.mergeschemasconfig.md#optional-assumevalid)*

*Overrides [MergeSchemasConfig](_merge_src_index_.mergeschemasconfig).[assumeValid](_merge_src_index_.mergeschemasconfig.md#optional-assumevalid)*

Defined in node_modules/graphql/type/schema.d.ts:122

When building a schema from a GraphQL service's introspection result, it
might be safe to assume the schema is valid. Set to true to assume the
produced schema is valid.

Default: false

___

### `Optional` assumeValidSDL

• **assumeValidSDL**? : *boolean*

*Inherited from [MergeSchemasConfig](_merge_src_index_.mergeschemasconfig).[assumeValidSDL](_merge_src_index_.mergeschemasconfig.md#optional-assumevalidsdl)*

Defined in node_modules/graphql/utilities/buildASTSchema.d.ts:22

Set to true to assume the SDL is valid.

Default: false

___

### `Optional` commentDescriptions

• **commentDescriptions**? : *boolean*

*Inherited from [GraphQLFileLoaderOptions](_loaders_graphql_file_src_index_.graphqlfileloaderoptions).[commentDescriptions](_loaders_graphql_file_src_index_.graphqlfileloaderoptions.md#optional-commentdescriptions)*

Defined in node_modules/graphql/utilities/buildASTSchema.d.ts:15

Descriptions are defined as preceding string literals, however an older
experimental version of the SDL supported preceding comments as
descriptions. Set to true to enable this deprecated behavior.
This option is provided to ease adoption and will be removed in v16.

Default: false

___

### `Optional` customFetch

• **customFetch**? : *[FetchFn](../modules/_loaders_url_src_index_.md#fetchfn) | string*

*Defined in [packages/loaders/url/src/index.ts:34](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L34)*

A custom `fetch` implementation to use when querying the original schema.
Defaults to `cross-fetch`

___

### `Optional` cwd

• **cwd**? : *string*

*Inherited from __type.cwd*

*Defined in [packages/utils/src/loaders.ts:14](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L14)*

___

### `Optional` enableSubscriptions

• **enableSubscriptions**? : *boolean*

*Defined in [packages/loaders/url/src/index.ts:42](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L42)*

Whether to enable subscriptions on the loaded schema

___

### `Optional` experimentalFragmentVariables

• **experimentalFragmentVariables**? : *boolean*

*Inherited from [GraphQLFileLoaderOptions](_loaders_graphql_file_src_index_.graphqlfileloaderoptions).[experimentalFragmentVariables](_loaders_graphql_file_src_index_.graphqlfileloaderoptions.md#optional-experimentalfragmentvariables)*

Defined in node_modules/graphql/language/parser.d.ts:51

EXPERIMENTAL:

If enabled, the parser will understand and parse variable definitions
contained in a fragment definition. They'll be represented in the
`variableDefinitions` field of the FragmentDefinitionNode.

The syntax is identical to normal, query-defined variables. For example:

  fragment A($var: Boolean = false) on T  {
    ...
  }

Note: this feature is experimental and may change or be removed in the
future.

___

### `Optional` headers

• **headers**? : *Headers*

*Defined in [packages/loaders/url/src/index.ts:29](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L29)*

Additional headers to include when querying the original schema

___

### `Optional` method

• **method**? : *"GET" | "POST"*

*Defined in [packages/loaders/url/src/index.ts:38](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L38)*

HTTP method to use when querying the original schema.

___

### `Optional` noLocation

• **noLocation**? : *boolean*

*Inherited from [GraphQLFileLoaderOptions](_loaders_graphql_file_src_index_.graphqlfileloaderoptions).[noLocation](_loaders_graphql_file_src_index_.graphqlfileloaderoptions.md#optional-nolocation)*

Defined in node_modules/graphql/language/parser.d.ts:13

By default, the parser creates AST nodes that know the location
in the source that they correspond to. This configuration flag
disables that behavior for performance or testing.

___

### `Optional` useGETForQueries

• **useGETForQueries**? : *boolean*

*Defined in [packages/loaders/url/src/index.ts:51](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L51)*

Whether to use the GET HTTP method for queries when querying the original schema

___

### `Optional` webSocketImpl

• **webSocketImpl**? : *typeof w3cwebsocket | string*

*Defined in [packages/loaders/url/src/index.ts:47](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L47)*

Custom WebSocket implementation used by the loaded schema if subscriptions
are enabled
