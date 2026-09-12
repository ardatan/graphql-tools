---
title: "uniqueCode"
description: "The uniqueCode variable exported by @graphql-tools/webpack-loader-runtime."
---

> `const` **uniqueCode**: "\n  var names = \{\};\n  function unique(defs) \{\n    return (defs \|\| \[\]).filter(function (def) \{\n      if (def.kind !== 'FragmentDefinition') return true;\n      var name = def.name.value;\n      if (names\[name\]) \{\n        return false;\n      \} else \{\n        names\[name\] = true;\n        return true;\n      \}\n    \});\n  \};\n"

Defined in: [packages/webpack-loader-runtime/src/index.ts:3](https://github.com/ardatan/graphql-tools/blob/master/packages/webpack-loader-runtime/src/index.ts#L3)
