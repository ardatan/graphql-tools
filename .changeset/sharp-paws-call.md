---
'@graphql-tools/url-loader': minor
---

Some environments like CF Workers don't support `credentials` in RequestInit object. But by default UrlLoader sends 'same-origin' and it wasn't possible to disable it. Now you can pass 'disable' to remove `credentials` property from RequestInit object completely.

```ts
new UrlLoader().load(url, { credentials: 'disable' })
```
