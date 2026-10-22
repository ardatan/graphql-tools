---
'@graphql-tools/utils': patch
---

`mapSchema` now remaps directive argument defaults the same way it already remaps field argument defaults.

Use case: `UserRole` is remapped to internal ids, and `@auth` defaults to `USER`.

```ts
const schema = mapSchema(originalSchema, {
  [MapperKind.ENUM_VALUE]: (valueConfig, typeName, _schema, externalValue) => {
    if (typeName === 'UserRole' && externalValue === 'USER') {
      return { ...valueConfig, value: '3user' };
    }
    return valueConfig;
  },
});

// directive @auth(role: UserRole = USER)
schema.getDirective('auth').args.find(arg => arg.name === 'role').defaultValue;
// before: "USER"
// after:  "3user"
```

`forEachDefaultValue` walks directive arguments too, so `makeExecutableSchema` enum resolvers get the same result.
