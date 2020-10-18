Currently, when remote schemas are stitched using graphql-tools, cache hints are not present in the response headers of the gateway where stitching happens.

This example shows how to get cache hints in the final response headers. It uses graphql-tools v6 and two remote services with simple author and chirp schemas. 

In `retrieveCacheHintLink` inside remoteSchema.ts, `Cache-Control` header is retrieved and added to `cacheControl` list.

```typescript
const cacheControl = context.response.headers.get('Cache-Control');
context.graphqlContext.cacheControl.push(cacheControl);
```

This link is added to the apollo-link chain. 

```typescript
const link = ApolloLink.from([retrieveCacheHintLink, new HttpLink({ uri: remoteUrl, fetch })]);
```

This way, every time a remote service call happens, cache hints are retrieved from the response headers. 

Then, at the gateway, after the stitched query is resolved and before sending back the response, the lowest `max-age` is calculated and set to the response headers. This happens in `cacheControlHeaderPlugin` => `willSendResponse()`,

```typescript
const cacheHeader = calculateCacheHeader(context.cacheControl);
response.http.headers.set('Cache-Control', cacheHeader);
```