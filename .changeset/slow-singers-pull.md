---
'@graphql-tools/delegate': patch
'@graphql-tools/links': patch
'@graphql-tools/git-loader': patch
'@graphql-tools/url-loader': patch
'@graphql-tools/stitch': patch
'@graphql-tools/utils': patch
'@graphql-tools/wrap': patch
---

Refine generic typings using `extends X` when appropriate

Typescript 4.7 has stricter requirements around generics
which is explained well in the related PR:
https://github.com/microsoft/TypeScript/pull/48366

These changes resolve the errors that these packages will
face when attempting to upgrade to TS 4.7 (still in beta
at the time of writing this). Landing these changes now
will allow other TS libraries which depend on these
packages to experiment with TS 4.7 in the meantime.
