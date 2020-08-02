---
id: stitch-schema-transforms
title: Schema transforms
sidebar_label: Schema transforms
---

## Using with Transforms

Often, when creating a GraphQL gateway that combines multiple existing schemas, we might want to modify one of the schemas. The most common tasks include renaming some of the types, and filtering the root fields. By using [transforms](/docs/schema-wrapping) with schema stitching, we can easily tweak the subschemas before merging them together. (In earlier versions of graphql-tools, this required an additional round of delegation prior to merging, but transforms can now be specifying directly when merging using the new subschema configuration objects.)

For example, suppose we transform the `chirpSchema` by removing the `chirpsByAuthorId` field and add a `Chirp_` prefix to all types and field names, in order to make it very clear which types and fields came from `chirpSchema`:

```ts
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { stitchSchemas } from '@graphql-tools/stitch';
import {
  FilterRootFields,
  RenameTypes,
  RenameRootFields,
} from '@graphql-tools/wrap';

// Mocked chirp schema; we don't want to worry about the schema
// implementation right now since we're just demonstrating
// schema stitching
let chirpSchema = makeExecutableSchema({
  typeDefs: `
    type Chirp {
      id: ID!
      text: String
      authorId: ID!
    }

    type Query {
      chirpById(id: ID!): Chirp
      chirpsByAuthorId(authorId: ID!): [Chirp]
    }
  `
});

chirpSchema = addMocksToSchema({ schema: chirpSchema });

// create transforms

const chirpSchemaTransforms = [
  new FilterRootFields(
    (operation: string, rootField: string) => rootField !== 'chirpsByAuthorId'
  ),
  new RenameTypes((name: string) => `Chirp_${name}`),
  new RenameRootFields((operation: 'Query' | 'Mutation' | 'Subscription', name: string) => `Chirp_${name}`),
];
```

We will now have a schema that has all fields and types prefixed with `Chirp_` and has only the `chirpById` root field.

Now let's implement the resolvers:

```ts
const chirpSubschema = {
  schema: chirpSchema,
  transforms: chirpSchemaTransforms,
}

export const schema = stitchSchemas({
  subschemas: [
    chirpSubschema,
    { schema: authorSchema },
  ],
  typeDefs: linkTypeDefs,

  resolvers: {
    User: {
      chirps: {
        selectionSet: `{ id }`,
        resolve(user, args, context, info) {
          return delegateToSchema({
            schema: chirpSubschema,
            operation: 'query',
            fieldName: 'chirpsByAuthorId',
            args: {
              authorId: user.id,
            },
            context,
            info,
          });
        },
      },
    },
    Chirp_Chirp: {
      author: {
        selectionSet: `{ authorId }`,
        resolve(chirp, args, context, info) {
          return delegateToSchema({
            schema: authorSchema,
            operation: 'query',
            fieldName: 'userById',
            args: {
              id: chirp.authorId,
            },
            context,
            info,
          });
        },
      },
    },
  },
});
```

Notice that when we call `delegateToSchema` in the `User.chirps` resolvers, we can delegate to the original `chirpsByAuthorId` field, even though it has been filtered out of the final schema.
