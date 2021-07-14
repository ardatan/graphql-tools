import {
  DocumentNode,
  GraphQLSchema,
  Kind,
  SelectionSetNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  GraphQLOutputType,
  OperationDefinitionNode,
  FragmentDefinitionNode,
  SelectionNode,
  DefinitionNode,
} from 'graphql';

import { ExecutionRequest, Maybe, getDefinedRootType } from '@graphql-tools/utils';

import { Transform, DelegationContext } from '../types';
import { collectFields, ExecutionContext } from 'graphql/execution/execute.js';

type VisitSelectionSetsVisitor = (node: SelectionSetNode, typeInfo: TypeInfo) => Maybe<SelectionSetNode>;

export default class VisitSelectionSets implements Transform {
  private readonly visitor: VisitSelectionSetsVisitor;

  constructor(visitor: VisitSelectionSetsVisitor) {
    this.visitor = visitor;
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): ExecutionRequest {
    const document = visitSelectionSets(
      originalRequest,
      delegationContext.info.schema,
      delegationContext.returnType,
      this.visitor
    );
    return {
      ...originalRequest,
      document,
    };
  }
}

function visitSelectionSets(
  request: ExecutionRequest,
  schema: GraphQLSchema,
  initialType: GraphQLOutputType,
  visitor: VisitSelectionSetsVisitor
): DocumentNode {
  const { document, variables } = request;

  const typeInfo = new TypeInfo(schema, undefined, initialType);
  const operations: Array<OperationDefinitionNode> = [];
  const fragments: Record<string, FragmentDefinitionNode> = Object.create(null);
  const newDefinitions: Array<DefinitionNode> = [];

  for (const def of document.definitions) {
    if (def.kind === Kind.OPERATION_DEFINITION) {
      const operation = def;
      operations.push(def);

      const type = getDefinedRootType(schema, operation.operation);
      const fields = collectFields(
        {
          schema,
          variableValues: variables,
          fragments,
        } as ExecutionContext,
        type,
        operation.selectionSet,
        Object.create(null),
        Object.create(null)
      );

      const newSelections: Array<SelectionNode> = [];
      for (const responseKey in fields) {
        const fieldNodes = fields[responseKey];
        for (const fieldNode of fieldNodes) {
          const selectionSet = fieldNode.selectionSet;

          if (selectionSet == null) {
            newSelections.push(fieldNode);
            continue;
          }

          const newSelectionSet = visit(
            selectionSet,
            visitWithTypeInfo(typeInfo, {
              [Kind.SELECTION_SET]: node => visitor(node, typeInfo),
            })
          );

          if (newSelectionSet === selectionSet) {
            newSelections.push(fieldNode);
            continue;
          }

          newSelections.push({
            ...fieldNode,
            selectionSet: newSelectionSet,
          });
        }
      }

      newDefinitions.push({
        ...def,
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: newSelections,
        },
      });
    } else if (def.kind === Kind.FRAGMENT_DEFINITION) {
      fragments[def.name.value] = def;
      newDefinitions.push(
        visit(
          def,
          visitWithTypeInfo(typeInfo, {
            [Kind.SELECTION_SET]: node => visitor(node, typeInfo),
          })
        )
      );
    }
  }

  return {
    ...document,
    definitions: newDefinitions,
  };
}
