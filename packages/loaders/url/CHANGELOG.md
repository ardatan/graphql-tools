# @graphql-tools/url-loader

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
