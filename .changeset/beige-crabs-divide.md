---
'@graphql-tools/code-file-loader': major
---

# Fix CodeFile Loader's Bug

Original CodeFileLoader's `mergeOption` method only does shadow copy, but option.pluckConfig is an object, shadow copy method would cause the coming option to overwrite the old option (pass when object construct).So we should change `mergeOption` to Deep copy, which would not cause overwrite.
