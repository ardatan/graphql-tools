import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLFieldResolver,
  GraphQLError,
  FieldNode,
  FragmentDefinitionNode,
  SelectionSetNode,
  Kind,
} from 'graphql';

import {
  Transform,
  Request,
  appendObjectFields,
  selectObjectFields,
  modifyObjectFields,
  ExecutionResult,
  relocatedError,
} from '@graphql-tools/utils';

import { defaultMergedResolver } from '@graphql-tools/delegate';

import MapFields from './MapFields';

interface WrapFieldsTransformationContext {
  nextIndex: number;
  paths: Record<string, { pathToField: Array<string>; alias: string }>;
}

function defaultWrappingResolver(
  parent: any,
  args: Record<string, any>,
  context: Record<string, any>,
  info: GraphQLResolveInfo
): any {
  if (!parent) {
    return {};
  }

  return defaultMergedResolver(parent, args, context, info);
}

export default class WrapFields implements Transform {
  private readonly outerTypeName: string;
  private readonly wrappingFieldNames: Array<string>;
  private readonly wrappingTypeNames: Array<string>;
  private readonly numWraps: number;
  private readonly fieldNames: Array<string>;
  private readonly wrappingResolver: GraphQLFieldResolver<any, any>;
  private readonly transformer: Transform;

  constructor(
    outerTypeName: string,
    wrappingFieldNames: Array<string>,
    wrappingTypeNames: Array<string>,
    fieldNames?: Array<string>,
    wrappingResolver: GraphQLFieldResolver<any, any> = defaultWrappingResolver,
    prefix = 'gqtld'
  ) {
    this.outerTypeName = outerTypeName;
    this.wrappingFieldNames = wrappingFieldNames;
    this.wrappingTypeNames = wrappingTypeNames;
    this.numWraps = wrappingFieldNames.length;
    this.fieldNames = fieldNames;
    this.wrappingResolver = wrappingResolver;

    const remainingWrappingFieldNames = this.wrappingFieldNames.slice();
    const outerMostWrappingFieldName = remainingWrappingFieldNames.shift();
    this.transformer = new MapFields(
      {
        [outerTypeName]: {
          [outerMostWrappingFieldName]: (
            fieldNode,
            fragments,
            transformationContext: WrapFieldsTransformationContext
          ) =>
            hoistFieldNodes({
              fieldNode,
              path: remainingWrappingFieldNames,
              fieldNames,
              fragments,
              transformationContext,
              prefix,
            }),
        },
      },
      {
        [outerTypeName]: (value, context: WrapFieldsTransformationContext) => dehoistValue(value, context),
      },
      (errors, context: WrapFieldsTransformationContext) => dehoistErrors(errors, context)
    );
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    const targetFieldConfigMap = selectObjectFields(
      schema,
      this.outerTypeName,
      !this.fieldNames ? () => true : fieldName => this.fieldNames.includes(fieldName)
    );

    let wrapIndex = this.numWraps - 1;
    let wrappingTypeName = this.wrappingTypeNames[wrapIndex];
    let wrappingFieldName = this.wrappingFieldNames[wrapIndex];

    let newSchema = appendObjectFields(schema, wrappingTypeName, targetFieldConfigMap);

    for (wrapIndex--; wrapIndex > -1; wrapIndex--) {
      const nextWrappingTypeName = this.wrappingTypeNames[wrapIndex];

      newSchema = appendObjectFields(newSchema, nextWrappingTypeName, {
        [wrappingFieldName]: {
          type: newSchema.getType(wrappingTypeName) as GraphQLObjectType,
          resolve: this.wrappingResolver,
        },
      });

      wrappingTypeName = nextWrappingTypeName;
      wrappingFieldName = this.wrappingFieldNames[wrapIndex];
    }

    const selectedFieldNames = Object.keys(targetFieldConfigMap);
    [newSchema] = modifyObjectFields(
      newSchema,
      this.outerTypeName,
      fieldName => selectedFieldNames.includes(fieldName),
      {
        [wrappingFieldName]: {
          type: newSchema.getType(wrappingTypeName) as GraphQLObjectType,
          resolve: this.wrappingResolver,
        },
      }
    );

    return this.transformer.transformSchema(newSchema);
  }

  public transformRequest(
    originalRequest: Request,
    delegationContext: Record<string, any>,
    transformationContext: WrapFieldsTransformationContext
  ): Request {
    transformationContext.nextIndex = 0;
    transformationContext.paths = Object.create(null);
    return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext: Record<string, any>,
    transformationContext: WrapFieldsTransformationContext
  ): ExecutionResult {
    return this.transformer.transformResult(originalResult, delegationContext, transformationContext);
  }
}

function collectFields(
  selectionSet: SelectionSetNode,
  fragments: Record<string, FragmentDefinitionNode>,
  fields: Array<FieldNode> = [],
  visitedFragmentNames = {}
): Array<FieldNode> {
  if (selectionSet != null) {
    selectionSet.selections.forEach(selection => {
      switch (selection.kind) {
        case Kind.FIELD:
          fields.push(selection);
          break;
        case Kind.INLINE_FRAGMENT:
          collectFields(selection.selectionSet, fragments, fields, visitedFragmentNames);
          break;
        case Kind.FRAGMENT_SPREAD: {
          const fragmentName = selection.name.value;
          if (!visitedFragmentNames[fragmentName]) {
            visitedFragmentNames[fragmentName] = true;
            collectFields(fragments[fragmentName].selectionSet, fragments, fields, visitedFragmentNames);
          }
          break;
        }
        default:
          // unreachable
          break;
      }
    });
  }

  return fields;
}

function aliasFieldNode(fieldNode: FieldNode, str: string): FieldNode {
  return {
    ...fieldNode,
    alias: {
      kind: Kind.NAME,
      value: str,
    },
  };
}

function hoistFieldNodes({
  fieldNode,
  fieldNames,
  path,
  fragments,
  transformationContext,
  prefix,
  index = 0,
  wrappingPath = [],
}: {
  fieldNode: FieldNode;
  fieldNames?: Array<string>;
  path: Array<string>;
  fragments: Record<string, FragmentDefinitionNode>;
  transformationContext: WrapFieldsTransformationContext;
  prefix: string;
  index?: number;
  wrappingPath?: ReadonlyArray<string>;
}): Array<FieldNode> {
  const alias = fieldNode.alias != null ? fieldNode.alias.value : fieldNode.name.value;

  let newFieldNodes: Array<FieldNode> = [];

  if (index < path.length) {
    const pathSegment = path[index];
    collectFields(fieldNode.selectionSet, fragments).forEach((possibleFieldNode: FieldNode) => {
      if (possibleFieldNode.name.value === pathSegment) {
        const newWrappingPath = wrappingPath.concat([alias]);

        newFieldNodes = newFieldNodes.concat(
          hoistFieldNodes({
            fieldNode: possibleFieldNode,
            fieldNames,
            path,
            fragments,
            transformationContext,
            prefix,
            index: index + 1,
            wrappingPath: newWrappingPath,
          })
        );
      }
    });
  } else {
    collectFields(fieldNode.selectionSet, fragments).forEach((possibleFieldNode: FieldNode) => {
      if (!fieldNames || fieldNames.includes(possibleFieldNode.name.value)) {
        const nextIndex = transformationContext.nextIndex;
        transformationContext.nextIndex++;
        const indexingAlias = `__${prefix}${nextIndex}__`;
        transformationContext.paths[indexingAlias] = {
          pathToField: wrappingPath.concat([alias]),
          alias: possibleFieldNode.alias != null ? possibleFieldNode.alias.value : possibleFieldNode.name.value,
        };
        newFieldNodes.push(aliasFieldNode(possibleFieldNode, indexingAlias));
      }
    });
  }

  return newFieldNodes;
}

export function dehoistValue(originalValue: any, context: WrapFieldsTransformationContext): any {
  if (originalValue == null) {
    return originalValue;
  }

  const newValue = Object.create(null);

  Object.keys(originalValue).forEach(alias => {
    let obj = newValue;

    const path = context.paths[alias];
    if (path == null) {
      newValue[alias] = originalValue[alias];
      return;
    }

    const pathToField = path.pathToField;
    const fieldAlias = path.alias;
    pathToField.forEach(key => {
      obj = obj[key] = obj[key] || Object.create(null);
    });
    obj[fieldAlias] = originalValue[alias];
  });

  return newValue;
}

function dehoistErrors(
  errors: ReadonlyArray<GraphQLError>,
  context: WrapFieldsTransformationContext
): Array<GraphQLError> {
  if (errors === undefined) {
    return undefined;
  }

  return errors.map(error => {
    const originalPath = error.path;
    if (originalPath == null) {
      return error;
    }

    let newPath: Array<string | number> = [];
    originalPath.forEach(pathSegment => {
      if (typeof pathSegment !== 'string') {
        newPath.push(pathSegment);
        return;
      }

      const path = context.paths[pathSegment];
      if (path == null) {
        newPath.push(pathSegment);
        return;
      }

      newPath = newPath.concat(path.pathToField, [path.alias]);
    });

    return relocatedError(error, newPath);
  });
}
