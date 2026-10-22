---
'@graphql-tools/utils': patch
---

Directive argument defaults now go through the same serialize/parse path as field arguments after enum resolvers remapped internal values.

Use case: `@auth` with a default role, plus enum resolvers that map GraphQL names to internal ids.

```ts
const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    enum UserRole {
      ADMIN
      MODERATOR
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

getDirective(schema, usersField, 'auth')[0].role;
// before: "USER"   (schema name, not remapped)
// after:  "3user"  (same remapping as an explicit @auth(role: ADMIN) already had)
```

`forEachDefaultValue` and `mapSchema` now walk directive arguments, so a visitor that remaps enums (or otherwise parse/serialize defaults) applies to `@auth(role: UserRole = USER)` the same way it does to a field argument default. Introspection of that default also sees the internal value.
