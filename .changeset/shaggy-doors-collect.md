---
"@graphql-tools/executor": patch
---

Some libraries like `undici` throw objects that are not `Error` instances when the response is tried to parse as JSON but failed.
In that case, executor prints an error like below;

```
NonErrorThrown: Unexpected error value: {...}
at toError (/usr/src/app/node_modules/graphql/jsutils/toError.js:16:7)
at locatedError (/usr/src/app/node_modules/graphql/error/locatedError.js:20:46)
at /usr/src/app/node_modules/@graphql-tools/executor/cjs/execution/execute.js:330:58
at processTicksAndRejections (node:internal/process/task_queues:95:5)
at async /usr/src/app/node_modules/@graphql-tools/executor/cjs/execution/promiseForObject.js:18:35
at async Promise.all (index 0)
```

But actually the shape of the object matches the `Error` interface.
In that case, the executor now coerces the object to an `Error` instance by taking `message`, `stack`, `name` and `cause` properties.
So the user will get the error correctly.
