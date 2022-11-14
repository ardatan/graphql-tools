import {
  Kind,
  validate,
  GraphQLSchema,
  specifiedRules,
  ValidationContext,
  ASTVisitor,
  DocumentNode,
  versionInfo,
  DefinitionNode,
} from 'graphql';

export type ValidationRule = (context: ValidationContext) => ASTVisitor;

export function validateGraphQlDocuments(
  schema: GraphQLSchema,
  documents: DocumentNode[],
  rules: ValidationRule[] = createDefaultRules()
) {
  const definitionMap = new Map<string, DefinitionNode>();
  for (const document of documents) {
    for (const docDefinition of document.definitions) {
      if ('name' in docDefinition && docDefinition.name) {
        definitionMap.set(`${docDefinition.kind}_${docDefinition.name.value}`, docDefinition);
      } else {
        definitionMap.set(Date.now().toString(), docDefinition);
      }
    }
  }
  const fullAST: DocumentNode = {
    kind: Kind.DOCUMENT,
    definitions: Array.from(definitionMap.values()),
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
