---
'@graphql-tools/utils': patch
---

Use `specifiedDirectives.some` instead of `isSpecifiedDirective` to check if the directive is a
native directive

In case of overriding a native directive like `@deprecated`, `isSpecifiedDirective` only checks the name like;

```ts
isSpecifiedDirective(directive) {
  return specifiedDirectives.some(specifiedDirective => directive.name === specifiedDirective.name);
}
```

But we need to check the actual reference equality to avoid rewiring native directives like below;

```ts
specifiedDirectives.some(specifiedDirective => directive === specifiedDirective)
```
