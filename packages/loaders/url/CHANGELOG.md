# @graphql-tools/url-loader

## 7.2.0

### Minor Changes

- eeba7390: Integrate and document `graphql-sse`

## 7.1.0

### Minor Changes

- c5b0719c: feat: GraphQL v16 support

### Patch Changes

- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
  - @graphql-tools/delegate@8.2.0
  - @graphql-tools/utils@8.2.0
  - @graphql-tools/wrap@8.1.0

## 7.0.12

### Patch Changes

- e4dc54de: Add missing `@types/ws` dependency
- Updated dependencies [c8c13ed1]
  - @graphql-tools/delegate@8.1.1
  - @graphql-tools/utils@8.1.2

## 7.0.11

### Patch Changes

- e50852e6: use version ranges instead of a fixed version for the graphql-tools package versions
- Updated dependencies [631b11bd]
- Updated dependencies [e50852e6]
  - @graphql-tools/delegate@8.1.0
  - @graphql-tools/wrap@8.0.13

## 7.0.10

### Patch Changes

- Updated dependencies [2c807ddb]
  - @graphql-tools/utils@8.1.1
  - @graphql-tools/delegate@8.0.10
  - @graphql-tools/wrap@8.0.12

## 7.0.9

### Patch Changes

- Updated dependencies [9a13357c]
  - @graphql-tools/delegate@8.0.9
  - @graphql-tools/wrap@8.0.11

## 7.0.8

### Patch Changes

- Updated dependencies [b9684631]
- Updated dependencies [9ede806a]
- Updated dependencies [67691b78]
  - @graphql-tools/utils@8.1.0
  - @graphql-tools/delegate@8.0.8
  - @graphql-tools/wrap@8.0.10

## 7.0.7

### Patch Changes

- Updated dependencies [d47dcf42]
  - @graphql-tools/delegate@8.0.7
  - @graphql-tools/wrap@8.0.7

## 7.0.6

### Patch Changes

- Updated dependencies [ded29f3d]
  - @graphql-tools/delegate@8.0.6
  - @graphql-tools/wrap@8.0.6

## 7.0.5

### Patch Changes

- Updated dependencies [7fdef335]
  - @graphql-tools/delegate@8.0.5
  - @graphql-tools/wrap@8.0.5

## 7.0.4

### Patch Changes

- Updated dependencies [04830049]
  - @graphql-tools/utils@8.0.2
  - @graphql-tools/delegate@8.0.4
  - @graphql-tools/wrap@8.0.4

## 7.0.3

### Patch Changes

- Updated dependencies [b823dbaf]
  - @graphql-tools/utils@8.0.1
  - @graphql-tools/delegate@8.0.3
  - @graphql-tools/wrap@8.0.3

## 7.0.2

### Patch Changes

- Updated dependencies [d93945fa]
  - @graphql-tools/delegate@8.0.2
  - @graphql-tools/wrap@8.0.2

## 7.0.1

### Patch Changes

- c36defbe: fix(delegate): fix ESM import
- Updated dependencies [c36defbe]
  - @graphql-tools/delegate@8.0.1
  - @graphql-tools/wrap@8.0.1

## 7.0.0

### Major Changes

- af9a78de: BREAKING CHANGE

  - Now each loader handles glob patterns internally and returns an array of `Source` object instead of single `Source`

  - GraphQL Tag Pluck now respects code locations and returns graphql-js `Source` objects for each found code block

  - Thanks to the one above, `CodeFileLoader` now returns different `Source` objects for each found SDL code block.

- 614c08cc: BREAKING CHANGE
  - Remove `handleSDLAsync` and `handleSDLSync`; use `handleSDL` instead
  - Remove `useSSEForSubscription` and `useWebSocketLegacyProtocol`; use `subscriptionProtocol` instead
  - If introspection source is different than endpoint, use `endpoint` for remote execution source
  - Default HTTP Executor is renamed to `buildHTTPExecutor` with a new signature
  - `build*Subscriber` methods are renamed to `buildWSLegacyExecutor`, `buildWSExecutor` and `buildSSEExecutor` with new signatures
  - `getFetch` no longer takes `async` flag
- dae6dc7b: refactor: ExecutionParams type replaced by Request type

  rootValue property is now a part of the Request type.

  When delegating with delegateToSchema, rootValue can be set multiple ways:

  - when using a custom executor, the custom executor can utilize a rootValue in whichever custom way it specifies.
  - when using the default executor (execute/subscribe from graphql-js):
    -- rootValue can be passed to delegateToSchema via a named option
    -- rootValue can be included within a subschemaConfig
    -- otherwise, rootValue is inferred from the originating schema

  When using wrapSchema/stitchSchemas, a subschemaConfig can specify the createProxyingResolver function which can pass whatever rootValue it wants to delegateToSchema as above.

- c0ca3190: BREAKING CHANGE
  - Remove Subscriber and use only Executor
  - - Now `Executor` can receive `AsyncIterable` and subscriptions will also be handled by `Executor`. This is a future-proof change for defer, stream and live queries
- 7d3e3006: BREAKING CHANGE

  - No more accept arrays or functions for `headers`

  NEW FEATURES

  - Respect `operationName` and `extensions`
  - Ability to get headers from `extensions.headers`

### Patch Changes

- a31f9593: enhance(url-loader): avoid doing extra work on loader level
- fd81e800: fix(url-loader): fix node support for EventSource
- Updated dependencies [af9a78de]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [9c26b847]
- Updated dependencies [7d3e3006]
- Updated dependencies [d53e3be5]
- Updated dependencies [7d3e3006]
- Updated dependencies [dae6dc7b]
- Updated dependencies [6877b913]
- Updated dependencies [c42e811d]
- Updated dependencies [7d3e3006]
- Updated dependencies [8c8d4fc0]
- Updated dependencies [c0ca3190]
- Updated dependencies [7d3e3006]
- Updated dependencies [aa43054d]
- Updated dependencies [7d3e3006]
- Updated dependencies [74581cf3]
- Updated dependencies [c0ca3190]
- Updated dependencies [982c8f53]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
  - @graphql-tools/utils@8.0.0
  - @graphql-tools/delegate@8.0.0
  - @graphql-tools/wrap@8.0.0

## 6.10.1

### Patch Changes

- 491e77cf: enhance(url-loader): start legacy subscriptions connection lazily

## 6.10.0

### Minor Changes

- 20d2c7bc: feat(url-loader): multipart response support
- 20d2c7bc: feat(url-loader): ability to provide different subscriptionsEndpoint
  feat(url-loader): ability to provide headers factory that takes executionParams
- 77d63ab8: feat(url-loader): use fetch-event-source instead of sse-z

### Patch Changes

- Updated dependencies [20d2c7bc]
  - @graphql-tools/utils@7.9.0

## 6.9.0

### Minor Changes

- 854ce659: - Added support for legacy ws protocol
  - Ensured that headers are passed into ws connection params
- 947ccee8: feat(url-loader): ability to provide custom subscriptionsEndpoint

## 6.8.3

### Patch Changes

- 64663c45: chore(url-loader): Use compatible graphq-ws versioning

## 6.8.2

### Patch Changes

- 50bc2178: fix(url-loader): support newer cross-fetch

## 6.8.1

### Patch Changes

- f80ce4f4: enhance(url-loader/links): use new form-data that already supports streams

## 6.8.0

### Minor Changes

- c50deec5: chore(url-loader): bump graphql-ws version

## 6.7.1

### Patch Changes

- 298cd39e: fix(url-loader): do not fail multipart request when null variable given
- Updated dependencies [298cd39e]
  - @graphql-tools/utils@7.1.5

## 6.7.0

### Minor Changes

- cfe3e1f9: feat(url-loader): handle HTTP result as an SDL with handleAsSDL option

## 6.6.0

### Minor Changes

- 1ce1b9f7: feat(url-loader): support SSE for subscriptions

### Patch Changes

- 1ce1b9f7: fix(url-loader): fix issues with nonobject variables in multipart requests

## 6.5.0

### Minor Changes

- 4240a959: feat(url-loader): support graphql-ws and multipart requests and file upload

### Patch Changes

- Updated dependencies [4240a959]
- Updated dependencies [4240a959]
  - @graphql-tools/wrap@7.0.4
  - @graphql-tools/utils@7.1.4

## 6.4.0

### Minor Changes

- f9e72f2b: feat(url-loader): support loadSync

## 6.3.2

### Patch Changes

- 294dedda: fix(url-loader): fix typing mismatch
- Updated dependencies [294dedda]
- Updated dependencies [8133a907]
- Updated dependencies [2b6c813e]
  - @graphql-tools/delegate@7.0.1
  - @graphql-tools/utils@7.0.1

## 6.3.1

### Patch Changes

- Updated dependencies [be1a1575]
  - @graphql-tools/delegate@7.0.0
  - @graphql-tools/utils@7.0.0
  - @graphql-tools/wrap@7.0.0

## 6.3.0

### Minor Changes

- ead8c164: feat(url-loader): handle graphql sdl

## 6.2.4

### Patch Changes

- 533d6d53: Bump all packages to allow adjustments
- Updated dependencies [32c3c4f8]
- Updated dependencies [32c3c4f8]
- Updated dependencies [32c3c4f8]
- Updated dependencies [533d6d53]
  - @graphql-tools/wrap@6.2.4
  - @graphql-tools/utils@6.2.4
  - @graphql-tools/delegate@6.2.4
