---
'@graphql-tools/git-loader': patch
---

`git-loader` now passes `git show` / `git ls-tree` revision and path operands after `--`, and rejects `git:<ref>:<path>` pointer segments that start with `-` or contain unexpected extra `:` separators.
