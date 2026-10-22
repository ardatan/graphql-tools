---
'@graphql-tools/utils': patch
---

`mapSchema` and `forEachDefaultValue` now walk directive argument defaults, so a remapped enum default (`@auth(role: UserRole = USER)`) becomes the internal value — the same path field argument defaults already used.

Use case: an `@auth` transformer that reads the role from each field via `mapSchema` + `getDirective`, after enum resolvers mapped GraphQL names to internal ids.

```ts
const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    enum UserRole {
      ADMIN
      USER
    }

    directive @auth(role: UserRole = USER) on FIELD_DEFINITION

    type Query {
      usersList: [User] @auth
      adminsList: [User] @auth(role: ADMIN)
    }
  `,
  resolvers: {
    UserRole: {
      ADMIN: '0admin',
      USER: '3user',
    },
  },
});

mapSchema(schema, {
  [MapperKind.OBJECT_FIELD]: fieldConfig => {
    const role = getDirective(schema, fieldConfig, 'auth')?.[0]?.['role'];
    // usersList: was "USER", now "3user"
    // adminsList: already "0admin"
    return fieldConfig;
  },
});
```

Introspection of that default also sees the internal value.
