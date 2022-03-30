---
'@graphql-tools/schema': patch
---

Fix `addResolversToSchema` bug where type or field processing would be aborted prematurely.

In previous versions, if `requireResolversToMatchSchema` was set to `ignore`, although no error would be thrown for an unexpected resolver type, type processing would still be aborted early. This fix changes the behavior to correctly continue resolver type processing with the next provided type.

In previous versions, if a resolver field began with double underscores, it would correctly be used for legacy behavior to directly set a type property, but field processing would be aborted early. This fix changes the behavior to correctly continue type processing with the next field.
