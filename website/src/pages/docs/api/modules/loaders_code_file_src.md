# @graphql-tools/code-file-loader

### Classes

- [CodeFileLoader](/docs/api/classes/loaders_code_file_src.CodeFileLoader)

### Type Aliases

- [CodeFileLoaderConfig](loaders_code_file_src#codefileloaderconfig)
- [CodeFileLoaderOptions](loaders_code_file_src#codefileloaderoptions)

## Type Aliases

### CodeFileLoaderConfig

Ƭ **CodeFileLoaderConfig**: `Object`

#### Type declaration

| Name              | Type                                                                                          | Description                                                              |
| :---------------- | :-------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| `noPluck?`        | `boolean`                                                                                     | -                                                                        |
| `noRequire?`      | `boolean`                                                                                     | -                                                                        |
| `noSilentErrors?` | `boolean`                                                                                     | Set to `true` to raise errors if any matched files are not valid GraphQL |
| `pluckConfig?`    | [`GraphQLTagPluckOptions`](/docs/api/interfaces/graphql_tag_pluck_src.GraphQLTagPluckOptions) | -                                                                        |

#### Defined in

[packages/loaders/code-file/src/index.ts:27](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L27)

---

### CodeFileLoaderOptions

Ƭ **CodeFileLoaderOptions**: \{ `require?`: `string` \| `string`[] } &
[`CodeFileLoaderConfig`](loaders_code_file_src#codefileloaderconfig) &
[`BaseLoaderOptions`](utils_src#baseloaderoptions)

Additional options for loading from a code file

#### Defined in

[packages/loaders/code-file/src/index.ts:41](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L41)
