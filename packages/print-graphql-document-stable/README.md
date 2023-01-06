# `@graphql-tools/print-graphql-document-stable`

A stable way to print a GraphQL document.
All executable/fragment variable definitions, fields are printed in a stable way.
Useful for stuff like persisted GraphQL operations.

## Rules

- Fragments are always printed before executable operations
- Executable operations are sorted alphabetically by name.
- Arguments (Directive, Fields) are sorted alphabetical
- Selections sets are sorted Field, FragmentSpread, InlineFragmentSpread (sorted based on TypeCondition, inner SelectionSet)

## Install

```bash
yarn install @graphql-tools/print-graphql-document-stable
```

## Usage

```ts
import { parse } from 'graphql'
import { printExecutableGraphQLDocument } from '@graphql-tools/print-graphql-document-stable'

const inputDocument = parse(/* GraphQL */ `
  query A {
    ... on Query {
      a {
        ...B
        b
      }
    }
    ... on Query {
      a {
        ...B
        a
      }
    }
  }

  fragment B on Query {
    c
  }
`)
const outputStr = printExecutableGraphQLDocument(inputDocument)
console.assert(
  outputStr === 'fragment B on Query { c } query A { ... on Query { a { a ...B } } ... on Query { a { b ...B } } }',
  'Stuff is not equal.'
)
```
