---
id: "_utils_src_index_.schemaprintoptions"
title: "SchemaPrintOptions"
sidebar_label: "SchemaPrintOptions"
---

## Hierarchy

* **SchemaPrintOptions**

## Index

### Properties

* [commentDescriptions](_utils_src_index_.schemaprintoptions.md#optional-commentdescriptions)

## Properties

### `Optional` commentDescriptions

• **commentDescriptions**? : *boolean*

*Defined in [packages/utils/src/types.ts:10](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/types.ts#L10)*

Descriptions are defined as preceding string literals, however an older
experimental version of the SDL supported preceding comments as
descriptions. Set to true to enable this deprecated behavior.
This option is provided to ease adoption and will be removed in v16.

Default: false
