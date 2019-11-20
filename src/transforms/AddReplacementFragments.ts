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
import { Request, ReplacementFragmentMapping } from '../Interfaces';
import { Transform } from './transforms';

export default class AddReplacementFragments implements Transform {
  private targetSchema: GraphQLSchema;
  private mapping: ReplacementFragmentMapping;

  constructor(
    targetSchema: GraphQLSchema,
    mapping: ReplacementFragmentMapping,
  ) {
    this.targetSchema = targetSchema;
    this.mapping = mapping;
  }

  public transformRequest(originalRequest: Request): Request {
    const document = replaceFieldsWithFragments(
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

function replaceFieldsWithFragments(
  targetSchema: GraphQLSchema,
  document: DocumentNode,
  mapping: ReplacementFragmentMapping,
): DocumentNode {
  const typeInfo = new TypeInfo(targetSchema);
  return visit(
    document,
    visitWithTypeInfo(typeInfo, {
      [Kind.SELECTION_SET](
        node: SelectionSetNode,
      ): SelectionSetNode | null | undefined {
        const parentType: GraphQLType = typeInfo.getParentType();
        if (parentType) {
          const parentTypeName = parentType.name;
          let selections = node.selections;

          if (mapping[parentTypeName]) {
            node.selections.forEach(selection => {
              if (selection.kind === Kind.FIELD) {
                const name = selection.name.value;
                const fragment = mapping[parentTypeName][name];
                if (fragment) {
                  selections = selections.concat(fragment);
                }
              }
            });
          }

          if (selections !== node.selections) {
            return {
              ...node,
              selections,
            };
          }
        }
      },
    }),
  );
}
