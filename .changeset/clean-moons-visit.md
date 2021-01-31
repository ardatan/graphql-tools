---
"@graphql-tools/utils": patch
---

Fixes the handling of repeatable directives in the `getDirectives` method. Previously repeatable directives were nested and duplicated. They will now return as a flat array map:

```graphql
@mydir(arg: "first") @mydir(arg: "second")
```

translates into:

```js
{ mydir: [{ arg: "first" }, { arg: "second" }] }
````
