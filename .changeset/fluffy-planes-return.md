---
'@graphql-tools/executor-http': patch
---

Details in the extensions when an unexpected error occurs;

```json
{
  "request": {
    "endpoint": "https://api.example.com/graphql",
    "method": "POST",
    "body": {
      "query": "query { hello }"
    }
  },
  "response": {
    "status": 500,
    "statusText": "Internal Server Error",
    "headers": {
      "content-type": "application/json"
    },
    "body": {
      "errors": [
        {
          "message": "Internal Server Error"
        }
      ]
    }
  }
}
```
