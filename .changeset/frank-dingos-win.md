---
'@graphql-tools/github-loader': minor
'@graphql-tools/url-loader': minor
---

Bump HTTP Executor that introduces `exposeHTTPDetailsInExtensions` option

```ts
import { UrlLoader } from '@graphql-tools/url-loader'
import { parse } from 'graphql';

const loader = new UrlLoader();
const executor = loader.getExecutorAsync('http://localhost:4000/graphql', {
  exposeHTTPDetailsInExtensions: true,
});

const result = await executor({
  document: parse(/* GraphQL */ `
    query {
      hello
    }
  `),
});

console.log(result);
```

```json
{
  "data": {
    "hello": "Hello world!"
  },
  "extensions": {
    "request": {
      "method": "POST",
      "body": "{\"query\":\"query { hello }\"}",
      "headers": {
        "content-type": "application/json"
      }
    },
    "response": {
      "status": 200,
      "statusText": "OK",
      "headers": {
        "content-type": "application/json"
      },
      "body": { "data": { "hello": "Hello world!" } }
    }
  }
}
