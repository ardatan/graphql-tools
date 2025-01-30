# @graphql-tools/webpack-loader-runtime

### Variables

- [uniqueCode](webpack_loader_runtime_src#uniquecode)

### Functions

- [useUnique](webpack_loader_runtime_src#useunique)

## Variables

### uniqueCode

• `Const` **uniqueCode**:
`"\n  var names = {};\n  function unique(defs) {\n    return defs.filter(function (def) {\n      if (def.kind !== 'FragmentDefinition') return true;\n      var name = def.name.value;\n      if (names[name]) {\n        return false;\n      } else {\n        names[name] = true;\n        return true;\n      }\n    });\n  };\n"`

#### Defined in

[packages/webpack-loader-runtime/src/index.ts:3](https://github.com/ardatan/graphql-tools/blob/master/packages/webpack-loader-runtime/src/index.ts#L3)

## Functions

### useUnique

▸ **useUnique**(): (`defs`: `DefinitionNode`[]) => `DefinitionNode`[]

#### Returns

`fn`

▸ (`defs`): `DefinitionNode`[]

##### Parameters

| Name   | Type               |
| :----- | :----------------- |
| `defs` | `DefinitionNode`[] |

##### Returns

`DefinitionNode`[]

#### Defined in

[packages/webpack-loader-runtime/src/index.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/webpack-loader-runtime/src/index.ts#L19)
