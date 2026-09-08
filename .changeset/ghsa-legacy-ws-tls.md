---
'@graphql-tools/executor-legacy-ws': patch
'@graphql-tools/url-loader': patch
---

**Security:** Enable TLS certificate validation by default for legacy GraphQL WebSocket (`graphql-ws` protocol) connections over `wss://`.

`buildWSLegacyExecutor()` previously hardcoded `rejectUnauthorized: false`, so Node.js clients accepted any certificate (including self-signed or attacker-controlled ones). Credentials in `connectionParams` / `headers` and subscription payloads could be exposed to a network MITM. This addresses [GHSA-6fw5-9hq8-w87g](https://github.com/ardatan/graphql-tools/security/advisories/GHSA-6fw5-9hq8-w87g) (CWE-295).

### Behavior change
- Default is now `rejectUnauthorized: true` (Node TLS verifies the peer certificate).
- Connections to endpoints with untrusted/self-signed certificates will fail unless you opt out.

### Opt-out (trusted / local self-signed only)

```ts
buildWSLegacyExecutor(url, WebSocket, {
  rejectUnauthorized: false,
  connectionParams: { /* ... */ },
})
```

Or via `UrlLoader` / `LoadFromUrlOptions` when `subscriptionsProtocol` is `LEGACY_WS`:

```ts
{
  subscriptionsProtocol: SubscriptionProtocol.LEGACY_WS,
  rejectUnauthorized: false,
}
```

Browser WebSocket clients were never affected by this flag (browsers always validate certificates).
