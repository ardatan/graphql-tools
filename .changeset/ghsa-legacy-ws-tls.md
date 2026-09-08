---
'@graphql-tools/executor-legacy-ws': major
'@graphql-tools/url-loader': major
---

**Security / breaking:** Enable TLS certificate validation by default for legacy GraphQL WebSocket (`graphql-ws` protocol) connections over `wss://`.

`buildWSLegacyExecutor()` previously hardcoded `rejectUnauthorized: false`, so Node.js clients accepted any certificate (including self-signed or attacker-controlled ones). Credentials in `connectionParams` / `headers` and subscription payloads could be exposed to a network MITM. This addresses [GHSA-6fw5-9hq8-w87g](https://github.com/ardatan/graphql-tools/security/advisories/GHSA-6fw5-9hq8-w87g) (CWE-295).

### Breaking change
- Default is now `rejectUnauthorized: true` (Node TLS verifies the peer certificate).
- Connections that previously succeeded against untrusted or self-signed certificates will now fail unless you explicitly opt out.

### Migration
Trusted / local self-signed setups must pass `rejectUnauthorized: false`:

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
