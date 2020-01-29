import {
  DocumentNode,
  GraphQLSchema,
  GraphQLType,
  Kind,
  SelectionSetNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
} from 'graphql';
import { Request, MergedTypeInfo } from '../Interfaces';
import { Transform } from './transforms';

export default class AddMergedTypeFragments implements Transform {
  private targetSchema: GraphQLSchema;
  private mapping: Record<string, MergedTypeInfo>;

  constructor(
    targetSchema: GraphQLSchema,
    mapping: Record<string, MergedTypeInfo>,
  ) {
    this.targetSchema = targetSchema;
    this.mapping = mapping;
  }

  public transformRequest(originalRequest: Request): Request {
    const document = addMergedTypeSelectionSets(
      this.targetSchema,
      originalRequest.document,
      this.mapping,
    );
    return {
      ...originalRequest,
      document,
    };
  }
}

function addMergedTypeSelectionSets(
  targetSchema: GraphQLSchema,
  document: DocumentNode,
  mapping: Record<string, MergedTypeInfo>,
): DocumentNode {
  const typeInfo = new TypeInfo(targetSchema);
  return visit(
    document,
    visitWithTypeInfo(typeInfo, {
      leave: {
        [Kind.SELECTION_SET](
          node: SelectionSetNode,
        ): SelectionSetNode | null | undefined {
          const parentType: GraphQLType = typeInfo.getParentType();
          if (parentType) {
            const parentTypeName = parentType.name;
            let selections = node.selections;

            if (mapping[parentTypeName]) {
              selections = selections.concat(mapping[parentTypeName].selectionSet.selections);
            }

            if (selections !== node.selections) {
              return {
                ...node,
                selections,
              };
            }
          }
        },
      },
    }),
  );
}
