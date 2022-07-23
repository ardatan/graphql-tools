---
'@graphql-tools/url-loader': minor
---

Handle SSE responses by using TextDecoderStream if fetch API returns ReadableStream but not AsyncIterable. Previously we handle that with some extra logic that is already available in TextDecoderStream
