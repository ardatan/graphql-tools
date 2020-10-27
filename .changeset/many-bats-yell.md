---
'@graphql-tools/wrap': patch
---

transformedSchema argument within transformSchema method of transforms should be optional. The HoistField transform incorrectly set it to non-optional, breaking Typescript builds -- presumably when used with strict compilation.
