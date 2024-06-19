---
'@graphql-tools/executor-http': patch
---

Details in the extensions when an error occurs;

```json
{
  "request": {
    "endpoint": "https://api.example.com/graphql",
    "method": "POST",
    "body": {
      "query": "query { hello }"
    }
  },
  "http": {
    "status": 500,
    "statusText": "Internal Server Error",
    "headers": {
      "content-type": "application/json"
    }
  },
  "responseBody": {
    "errors": [
      {
        "message": "Internal Server Error"
      }
    ]
  }
}
```
