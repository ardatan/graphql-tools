---
id: relay-operation-optimizer
title: Optimizing operations using Relay Compiler
sidebar_label: Relay Operation Optimizer
---

`@graphql-tools/relay-operation-optimizer` is a package for bringing the benefits of Relay Compiler to GraphQL tools

### Current List of Features

- [Optimize Queries](https://relay.dev/docs/en/compiler-architecture#transforms) TL;DR: reduce query size
  - Inline Fragments
  - Flatten Transform
  - Skip Redundant Node Transform
- FragmentArguments
  - [`@argumentsDefinition`](https://relay.dev/docs/en/graphql-in-relay#argumentdefinitions)
  - [`@arguments`](https://relay.dev/docs/en/graphql-in-relay#arguments)

## Install Instructions

`yarn add -D -E @graphql-tools/relay-operation-optimizer`

