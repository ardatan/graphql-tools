[graphql-tools-monorepo](../README) / [loaders/module/src](../modules/loaders_module_src) /
ModuleLoader

# Class: ModuleLoader

[loaders/module/src](../modules/loaders_module_src).ModuleLoader

- This loader loads documents and type definitions from a Node module

```js
const schema = await loadSchema('module:someModuleName#someNamedExport', {
  loaders: [new ModuleLoader()]
})
```

## Implements

- [`Loader`](/docs/api/interfaces/utils_src.Loader)

## Table of contents

### Constructors

- [constructor](loaders_module_src.ModuleLoader#constructor)

### Methods

- [canLoad](loaders_module_src.ModuleLoader#canload)
- [canLoadSync](loaders_module_src.ModuleLoader#canloadsync)
- [load](loaders_module_src.ModuleLoader#load)
- [loadSync](loaders_module_src.ModuleLoader#loadsync)

## Constructors

### constructor

• **new ModuleLoader**()

## Methods

### canLoad

▸ **canLoad**(`pointer`): `Promise`\<`boolean`>

#### Parameters

| Name      | Type     |
| :-------- | :------- |
| `pointer` | `string` |

#### Returns

`Promise`\<`boolean`>

#### Defined in

[packages/loaders/module/src/index.ts:44](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/module/src/index.ts#L44)

---

### canLoadSync

▸ **canLoadSync**(`pointer`): `boolean`

#### Parameters

| Name      | Type     |
| :-------- | :------- |
| `pointer` | `string` |

#### Returns

`boolean`

#### Defined in

[packages/loaders/module/src/index.ts:58](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/module/src/index.ts#L58)

---

### load

▸ **load**(`pointer`): `Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Parameters

| Name      | Type     |
| :-------- | :------- |
| `pointer` | `string` |

#### Returns

`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Implementation of

[Loader](/docs/api/interfaces/utils_src.Loader).[load](/docs/api/interfaces/utils_src.Loader#load)

#### Defined in

[packages/loaders/module/src/index.ts:71](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/module/src/index.ts#L71)

---

### loadSync

▸ **loadSync**(`pointer`): [`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Parameters

| Name      | Type     |
| :-------- | :------- |
| `pointer` | `string` |

#### Returns

[`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Implementation of

[Loader](/docs/api/interfaces/utils_src.Loader).[loadSync](/docs/api/interfaces/utils_src.Loader#loadsync)

#### Defined in

[packages/loaders/module/src/index.ts:85](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/module/src/index.ts#L85)
