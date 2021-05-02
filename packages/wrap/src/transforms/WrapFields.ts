import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLError,
  FieldNode,
  FragmentDefinitionNode,
  SelectionSetNode,
  Kind,
  GraphQLFieldConfigMap,
  GraphQLFieldConfig,
  GraphQLFieldResolver,
} from 'graphql';

import {
  Request,
  appendObjectFields,
  selectObjectFields,
  modifyObjectFields,
  ExecutionResult,
  relocatedError,
} from '@graphql-tools/utils';

import { Transform, defaultMergedResolver, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';

import MapFields from './MapFields';
import { defaultCreateProxyingResolver } from '../generateProxyingResolvers';

interface WrapFieldsTransformationContext {
  nextIndex: number;
  paths: Record<string, { pathToField: Array<string>; alias: string }>;
}

export default class WrapFields implements Transform<WrapFieldsTransformationContext> {
  private readonly outerTypeName: string;
  private readonly wrappingFieldNames: Array<string>;
  private readonly wrappingTypeNames: Array<string>;
  private readonly numWraps: number;
  private readonly fieldNames: Array<string>;
  private readonly transformer: Transform;

  constructor(
    outerTypeName: string,
    wrappingFieldNames: Array<string>,
    wrappingTypeNames: Array<string>,
    fieldNames?: Array<string>,
    prefix = 'gqtld'
  ) {
    this.outerTypeName = outerTypeName;
    this.wrappingFieldNames = wrappingFieldNames;
    this.wrappingTypeNames = wrappingTypeNames;
    this.numWraps = wrappingFieldNames.length;
    this.fieldNames = fieldNames;

    const remainingWrappingFieldNames = wrappingFieldNames.slice();
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
        [outerTypeName]: (value, context: WrapFieldsTransformationContext) =>
          dehoistValue(value, wrappingTypeNames, context),
      },
      (errors, context: WrapFieldsTransformationContext) => dehoistErrors(errors, context)
    );
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig,
    transformedSchema?: GraphQLSchema
  ): GraphQLSchema {
    const targetFieldConfigMap = selectObjectFields(
      originalWrappingSchema,
      this.outerTypeName,
      !this.fieldNames ? () => true : fieldName => this.fieldNames.includes(fieldName)
    );

    const newTargetFieldConfigMap: GraphQLFieldConfigMap<any, any> = Object.create(null);
    Object.keys(targetFieldConfigMap).forEach(fieldName => {
      const field = targetFieldConfigMap[fieldName];
      const newField: GraphQLFieldConfig<any, any> = {
        ...field,
        resolve: defaultMergedResolver,
      };
      newTargetFieldConfigMap[fieldName] = newField;
    });

    let wrapIndex = this.numWraps - 1;
    let wrappingTypeName = this.wrappingTypeNames[wrapIndex];
    let wrappingFieldName = this.wrappingFieldNames[wrapIndex];

    let newSchema = appendObjectFields(originalWrappingSchema, wrappingTypeName, newTargetFieldConfigMap);

    for (wrapIndex--; wrapIndex > -1; wrapIndex--) {
      const nextWrappingTypeName = this.wrappingTypeNames[wrapIndex];

      newSchema = appendObjectFields(newSchema, nextWrappingTypeName, {
        [wrappingFieldName]: {
          type: newSchema.getType(wrappingTypeName) as GraphQLObjectType,
          resolve: defaultMergedResolver,
        },
      });

      wrappingTypeName = nextWrappingTypeName;
      wrappingFieldName = this.wrappingFieldNames[wrapIndex];
    }

    const wrappingRootField =
      this.outerTypeName === originalWrappingSchema.getQueryType()?.name ||
      this.outerTypeName === originalWrappingSchema.getMutationType()?.name;

    let resolve: GraphQLFieldResolver<any, any>;
    if (transformedSchema) {
      if (wrappingRootField) {
        const targetSchema = subschemaConfig.schema;
        const operation = this.outerTypeName === targetSchema.getQueryType().name ? 'query' : 'mutation';
        const createProxyingResolver = subschemaConfig.createProxyingResolver ?? defaultCreateProxyingResolver;
        resolve = createProxyingResolver({
          subschemaConfig,
          transformedSchema,
          operation,
          fieldName: wrappingFieldName,
        });
      } else {
        resolve = defaultMergedResolver;
      }
    }

    const selectedFieldNames = Object.keys(newTargetFieldConfigMap);
    [newSchema] = modifyObjectFields(
      newSchema,
      this.outerTypeName,
      fieldName => selectedFieldNames.includes(fieldName),
      {
        [wrappingFieldName]: {
          type: newSchema.getType(wrappingTypeName) as GraphQLObjectType,
          resolve,
        },
      }
    );

    return this.transformer.transformSchema(newSchema, subschemaConfig, transformedSchema);
  }

  public transformRequest(
    originalRequest: Request,
    delegationContext: DelegationContext,
    transformationContext: WrapFieldsTransformationContext
  ): Request {
    transformationContext.nextIndex = 0;
    transformationContext.paths = Object.create(null);
    return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext,
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

export function dehoistValue(
  originalValue: any,
  wrappingTypeNames: Array<string>,
  context: WrapFieldsTransformationContext
): any {
  if (originalValue == null) {
    return originalValue;
  }

  const newValue = Object.create(null);

  Object.keys(originalValue).forEach(responseKey => {
    let obj = newValue;

    const path = context.paths[responseKey];
    if (path == null) {
      newValue[responseKey] = originalValue[responseKey];
      return;
    }

    const pathToField = path.pathToField;
    pathToField.forEach((key, index) => {
      obj = obj[key] = obj[key] ?? { __typename: wrappingTypeNames[index] };
    });
    obj[path.alias] = originalValue[responseKey];
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
