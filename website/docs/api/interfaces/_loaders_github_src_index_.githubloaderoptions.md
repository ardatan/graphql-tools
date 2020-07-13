---
id: "_loaders_github_src_index_.githubloaderoptions"
title: "GithubLoaderOptions"
sidebar_label: "GithubLoaderOptions"
---

Additional options for loading from GitHub

## Hierarchy

* ParseOptions & GraphQLSchemaValidationOptions & BuildSchemaOptions & object

  ↳ **GithubLoaderOptions**

## Index

### Properties

* [allowLegacySDLEmptyFields](_loaders_github_src_index_.githubloaderoptions.md#optional-allowlegacysdlemptyfields)
* [allowLegacySDLImplementsInterfaces](_loaders_github_src_index_.githubloaderoptions.md#optional-allowlegacysdlimplementsinterfaces)
* [assumeValid](_loaders_github_src_index_.githubloaderoptions.md#optional-assumevalid)
* [assumeValidSDL](_loaders_github_src_index_.githubloaderoptions.md#optional-assumevalidsdl)
* [commentDescriptions](_loaders_github_src_index_.githubloaderoptions.md#optional-commentdescriptions)
* [cwd](_loaders_github_src_index_.githubloaderoptions.md#optional-cwd)
* [experimentalFragmentVariables](_loaders_github_src_index_.githubloaderoptions.md#optional-experimentalfragmentvariables)
* [noLocation](_loaders_github_src_index_.githubloaderoptions.md#optional-nolocation)
* [pluckConfig](_loaders_github_src_index_.githubloaderoptions.md#optional-pluckconfig)
* [token](_loaders_github_src_index_.githubloaderoptions.md#token)

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

### `Optional` cwd

• **cwd**? : *string*

*Inherited from __type.cwd*

*Defined in [packages/utils/src/loaders.ts:14](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L14)*

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

### `Optional` noLocation

• **noLocation**? : *boolean*

*Inherited from [GraphQLFileLoaderOptions](_loaders_graphql_file_src_index_.graphqlfileloaderoptions).[noLocation](_loaders_graphql_file_src_index_.graphqlfileloaderoptions.md#optional-nolocation)*

Defined in node_modules/graphql/language/parser.d.ts:13

By default, the parser creates AST nodes that know the location
in the source that they correspond to. This configuration flag
disables that behavior for performance or testing.

___

### `Optional` pluckConfig

• **pluckConfig**? : *[GraphQLTagPluckOptions](_graphql_tag_pluck_src_index_.graphqltagpluckoptions)*

*Defined in [packages/loaders/github/src/index.ts:37](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L37)*

Additional options to pass to `graphql-tag-pluck`

___

###  token

• **token**: *string*

*Defined in [packages/loaders/github/src/index.ts:33](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L33)*

A GitHub access token
