---
"@graphql-tools/stitch": patch
---

Handle nested dependencies in the computed fields
```ts
{
  merge: {
    Product: {
      selectionSet: '{ id }',
      fields: {
        isExpensive: {
          selectionSet: '{ price }',
          computed: true,
        },
        canAfford: {
          selectionSet: '{ isExpensive }',
          computed: true,
        },
      }
    }
  }
}
```
