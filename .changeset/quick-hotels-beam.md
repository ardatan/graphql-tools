---
'@graphql-tools/stitch': major
'@graphql-tools/stitching-directives': major
'@graphql-tools/utils': major
'@graphql-tools/wrap': major
---

fix(getDirectives): preserve order around repeatable directives

BREAKING CHANGE: getDirectives now always return an array of individual DirectiveAnnotation objects consisting of `name` and `args` properties.

New useful function `getDirective` returns an array of objects representing any args for each use of a single directive (returning the empty object `{}` when a directive is used without arguments).

Note: The `getDirective` function returns an array even when the specified directive is non-repeatable. This is because one use of this function is to throw an error if more than one directive annotation is used for a non repeatable directive!

When specifying directives in extensions, one can use either the old or new format.
