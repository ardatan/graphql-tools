import { collectFields, GraphQLExecutionContext, parseSelectionSet } from '@graphql-tools/utils';
import { FieldNode, GraphQLSchema, GraphQLObjectType, GraphQLField, getNamedType } from 'graphql';

export function forwardArgsToSelectionSet(
  selectionSet: string,
  mapping?: Record<string, Array<string>>
): (schema: GraphQLSchema, field: GraphQLField<any, any>) => (originalFieldNode: FieldNode) => Array<FieldNode> {
  const selectionSetDef = parseSelectionSet(selectionSet, { noLocation: true });

  return (schema: GraphQLSchema, field: GraphQLField<any, any>) => {
    const partialExecutionContext = ({
      schema,
      variableValues: Object.create(null),
      fragments: Object.create(null),
    } as unknown) as GraphQLExecutionContext;

    const responseKeys = collectFields(
      partialExecutionContext,
      getNamedType(field.type) as GraphQLObjectType,
      selectionSetDef,
      Object.create(null),
      Object.create(null)
    );

    return (originalFieldNode: FieldNode): Array<FieldNode> => {
      const newFieldNodes: Array<FieldNode> = [];

      Object.values(responseKeys).forEach(fieldNodes => {
        fieldNodes.forEach(fieldNode => {
          if (!mapping) {
            newFieldNodes.push({
              ...fieldNode,
              arguments: originalFieldNode.arguments.slice(),
            });
          } else if (fieldNode.name.value in mapping) {
            const newArgs = mapping[fieldNode.name.value];
            newFieldNodes.push({
              ...fieldNode,
              arguments: originalFieldNode.arguments.filter((arg): boolean => newArgs.includes(arg.name.value)),
            });
          } else {
            newFieldNodes.push(fieldNode);
          }
        });
      });

      return newFieldNodes;
    };
  };
}
