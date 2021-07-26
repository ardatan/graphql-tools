---
'@graphql-tools/delegate': major
---

BREAKING CHANGES;

Refactor the core delegation transforms into individual functions to modify request and results. This will improve the performance considerably by reducing the number of visits over the request document.
- Replace `CheckResultAndHandleErrors` with `checkResultAndHandleErrors`
- Remove `delegationBindings`
- Replace `AddArgumentsAsVariables`, `AddSelectionSets`, `AddTypenameToAbstract`, `ExpandAbstractTypes`, `FilterToSchema`, `VisitSelectionSets` and `WrapConcreteTypes` with `prepareGatewayRequest` and `finalizeGatewayRequest`
