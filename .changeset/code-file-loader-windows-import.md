---
'@graphql-tools/code-file-loader': patch
---

Convert absolute filesystem paths to `file://` URLs before dynamic `import()`, so schema/document loading works on native Windows. Closes #8420.
