import {
  ASTVisitor,
  DefinitionNode,
  DocumentNode,
  GraphQLSchema,
  Kind,
  specifiedRules,
  validate,
  ValidationContext,
  versionInfo,
} from 'graphql';

export type ValidationRule = (context: ValidationContext) => ASTVisitor;

export function validateGraphQlDocuments(
  schema: GraphQLSchema,
  documents: DocumentNode[],
  rules: ValidationRule[] = createDefaultRules(),
) {
  const definitions = new Set<DefinitionNode>();
  const fragmentsDefinitionsMap = new Map<string, DefinitionNode>();
  for (const document of documents) {
    for (const docDefinition of document.definitions) {
      if (docDefinition.kind === Kind.FRAGMENT_DEFINITION) {
        fragmentsDefinitionsMap.set(docDefinition.name.value, docDefinition);
      } else {
        definitions.add(docDefinition);
      }
    }
  }
  const fullAST: DocumentNode = {
    kind: Kind.DOCUMENT,
    definitions: Array.from([...definitions, ...fragmentsDefinitionsMap.values()]),
  };
  const errors = validate(schema, fullAST, rules);
  for (const error of errors) {
    error.stack = error.message;
    if (error.locations) {
      for (const location of error.locations) {
        error.stack += `\n    at ${error.source?.name}:${location.line}:${location.column}`;
      }
    }
  }
  return errors;
}

export function createDefaultRules() {
  let ignored = ['NoUnusedFragmentsRule', 'NoUnusedVariablesRule', 'KnownDirectivesRule'];
  if (versionInfo.major < 15) {
    ignored = ignored.map(rule => rule.replace(/Rule$/, ''));
  }

  return specifiedRules.filter((f: (...args: any[]) => any) => !ignored.includes(f.name));
}
