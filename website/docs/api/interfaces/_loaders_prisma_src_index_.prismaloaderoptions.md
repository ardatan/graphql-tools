---
id: "_loaders_prisma_src_index_.prismaloaderoptions"
title: "PrismaLoaderOptions"
sidebar_label: "PrismaLoaderOptions"
---

additional options for loading from a `prisma.yml` file

## Hierarchy

  ↳ [LoadFromUrlOptions](_loaders_url_src_index_.loadfromurloptions)

  ↳ **PrismaLoaderOptions**

## Index

### Properties

* [allowLegacySDLEmptyFields](_loaders_prisma_src_index_.prismaloaderoptions.md#optional-allowlegacysdlemptyfields)
* [allowLegacySDLImplementsInterfaces](_loaders_prisma_src_index_.prismaloaderoptions.md#optional-allowlegacysdlimplementsinterfaces)
* [assumeValid](_loaders_prisma_src_index_.prismaloaderoptions.md#optional-assumevalid)
* [assumeValidSDL](_loaders_prisma_src_index_.prismaloaderoptions.md#optional-assumevalidsdl)
* [commentDescriptions](_loaders_prisma_src_index_.prismaloaderoptions.md#optional-commentdescriptions)
* [customFetch](_loaders_prisma_src_index_.prismaloaderoptions.md#optional-customfetch)
* [cwd](_loaders_prisma_src_index_.prismaloaderoptions.md#optional-cwd)
* [enableSubscriptions](_loaders_prisma_src_index_.prismaloaderoptions.md#optional-enablesubscriptions)
* [envVars](_loaders_prisma_src_index_.prismaloaderoptions.md#optional-envvars)
* [experimentalFragmentVariables](_loaders_prisma_src_index_.prismaloaderoptions.md#optional-experimentalfragmentvariables)
* [graceful](_loaders_prisma_src_index_.prismaloaderoptions.md#optional-graceful)
* [headers](_loaders_prisma_src_index_.prismaloaderoptions.md#optional-headers)
* [method](_loaders_prisma_src_index_.prismaloaderoptions.md#optional-method)
* [noLocation](_loaders_prisma_src_index_.prismaloaderoptions.md#optional-nolocation)
* [useGETForQueries](_loaders_prisma_src_index_.prismaloaderoptions.md#optional-usegetforqueries)
* [webSocketImpl](_loaders_prisma_src_index_.prismaloaderoptions.md#optional-websocketimpl)

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

*Inherited from [LoadFromUrlOptions](_loaders_url_src_index_.loadfromurloptions).[customFetch](_loaders_url_src_index_.loadfromurloptions.md#optional-customfetch)*

*Defined in [packages/loaders/url/src/index.ts:33](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L33)*

A custom `fetch` implementation to use when querying the original schema.
Defaults to `cross-fetch`

___

### `Optional` cwd

• **cwd**? : *string*

*Overrides __type.cwd*

*Defined in [packages/loaders/prisma/src/index.ts:14](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/prisma/src/index.ts#L14)*

___

### `Optional` enableSubscriptions

• **enableSubscriptions**? : *boolean*

*Inherited from [LoadFromUrlOptions](_loaders_url_src_index_.loadfromurloptions).[enableSubscriptions](_loaders_url_src_index_.loadfromurloptions.md#optional-enablesubscriptions)*

*Defined in [packages/loaders/url/src/index.ts:41](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L41)*

Whether to enable subscriptions on the loaded schema

___

### `Optional` envVars

• **envVars**? : *object*

*Defined in [packages/loaders/prisma/src/index.ts:12](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/prisma/src/index.ts#L12)*

#### Type declaration:

* \[ **key**: *string*\]: string

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

### `Optional` graceful

• **graceful**? : *boolean*

*Defined in [packages/loaders/prisma/src/index.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/prisma/src/index.ts#L13)*

___

### `Optional` headers

• **headers**? : *Headers*

*Inherited from [LoadFromUrlOptions](_loaders_url_src_index_.loadfromurloptions).[headers](_loaders_url_src_index_.loadfromurloptions.md#optional-headers)*

*Defined in [packages/loaders/url/src/index.ts:28](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L28)*

Additional headers to include when querying the original schema

___

### `Optional` method

• **method**? : *"GET" | "POST"*

*Inherited from [LoadFromUrlOptions](_loaders_url_src_index_.loadfromurloptions).[method](_loaders_url_src_index_.loadfromurloptions.md#optional-method)*

*Defined in [packages/loaders/url/src/index.ts:37](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L37)*

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

*Inherited from [LoadFromUrlOptions](_loaders_url_src_index_.loadfromurloptions).[useGETForQueries](_loaders_url_src_index_.loadfromurloptions.md#optional-usegetforqueries)*

*Defined in [packages/loaders/url/src/index.ts:50](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L50)*

Whether to use the GET HTTP method for queries when querying the original schema

___

### `Optional` webSocketImpl

• **webSocketImpl**? : *typeof w3cwebsocket | string*

*Inherited from [LoadFromUrlOptions](_loaders_url_src_index_.loadfromurloptions).[webSocketImpl](_loaders_url_src_index_.loadfromurloptions.md#optional-websocketimpl)*

*Defined in [packages/loaders/url/src/index.ts:46](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L46)*

Custom WebSocket implementation used by the loaded schema if subscriptions
are enabled
