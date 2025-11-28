---
'@graphql-tools/executor': minor
'@graphql-tools/utils': minor
---

Add optional schema coordinate in error extensions. This extension allows to precisely identify the
source of the error by automated tools like tracing or monitoring.

This new feature is opt-in, you have to enable it using `schemaCoordinateInErrors` executor option.

**Caution:** This feature, when enabled, will expose information about your schema. If you need to
keep your schema private and secret, you should strip this attribute at serialization time before
sending errors to the client.

```ts
import { parse } from 'graphql'
import { normalizedExecutor } from '@graphql-tools/executor'
import schema from './schema'

const result = await normalizedExecutor({
  schema,
  document: parse(`...`),
  schemaCoordinateInErrors: true // enable adding schema coordinate to graphql errors
})

if (result.errors) {
  for (const error of result.errors) {
    console.log('Error in resolver ', error.coordinate, ':', error.message)
    // or with `getSchemaCoordinate` util, to workaround types if needed
    console.log('Error in resolver', getSchemaCoordinate(error), ':', error.message)
  }
}
```
