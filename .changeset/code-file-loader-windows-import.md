---
'@graphql-tools/code-file-loader': patch
---

Convert absolute filesystem paths to `file://` URLs before dynamic `import()` in the ESM build so schema/document loading works on native Windows, while leaving raw paths for the CJS build where `import()` is downleveled to `require()`. Closes #8420.
