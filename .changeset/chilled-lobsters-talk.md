---
'@graphql-tools/graphql-file-loader': minor
---

This change allows pkg - npm to have snapshot stored schema files read by graphql-tools.

[pkg](https://www.npmjs.com/package/pkg) generates cross platform binary executables of node apps and includes a packaged read-only filesystem called a snapshot.

This change was made because the pkg snapshot file system does not support use of globbing.

If you want to use the snapshot facilty with pkg for schema files then:

1. Access your snapshot schema file or files through a __dirname join
2. Your file or files must be accessed by name without the glob '*' character.
3. Do not add ignore files with ! (with or without a glob)
4. Do not specify includeSources: true
