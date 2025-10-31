---
'@graphql-tools/executor': minor
---

Add optional schema coordinate in error extensions. This extension allows to precisely identify the
source of the error by automated tools like tracing or monitoring.

This new feature is opt-in, you have to enable it using `schemaCoordinateInErrors` executor option.

To avoid leaking schema information to the client, the extension key is a `Symbol` (which is not serializable).
To forward it to the client, copy it to a custom extension with a serializable key.

```ts
import { getSchemaCoordinate } from '@graphql-tools/utils'
import { normalizedExecutor } from '@graphql-tools/executor'
import { parse } from 'graphql'
import schema from './schema'

// You can also use `Symbol.for('graphql.error.schemaCoordinate')` to get the symbol if you don't
// want to depend on `@graphql-tools/utils`

const result = await normalizedExecutor({
  schema,
  document: parse(gql`...`),
  schemaCoordinateInErrors: true, // enable adding schema coordinate to graphql errors
});

if (result.errors) {
  for (const error of result.errors) {
    console.log(
      'Error in resolver ',
      getSchemaCoordinate(error), ':',
      error.message
    )
  }
}
```
