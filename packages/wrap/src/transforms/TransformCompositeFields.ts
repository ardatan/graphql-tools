import {
  GraphQLSchema,
  GraphQLType,
  DocumentNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  Kind,
  SelectionSetNode,
  SelectionNode,
  FragmentDefinitionNode,
  GraphQLInterfaceType,
  isObjectType,
  isInterfaceType,
  GraphQLObjectType,
  GraphQLFieldConfig,
  FieldDefinitionNode,
  ObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  ObjectTypeExtensionNode,
  InterfaceTypeExtensionNode,
} from 'graphql';

import { Transform, Request, MapperKind, mapSchema, visitData, ExecutionResult } from '@graphql-tools/utils';
import { FieldTransformer, FieldNodeTransformer, DataTransformer, ErrorsTransformer } from '../types';

export default class TransformCompositeFields implements Transform {
  private readonly fieldTransformer: FieldTransformer;
  private readonly fieldNodeTransformer: FieldNodeTransformer;
  private readonly dataTransformer: DataTransformer;
  private readonly errorsTransformer: ErrorsTransformer;
  private transformedSchema: GraphQLSchema;
  private typeInfo: TypeInfo;
  private mapping: Record<string, Record<string, string>>;

  constructor(
    fieldTransformer: FieldTransformer,
    fieldNodeTransformer?: FieldNodeTransformer,
    dataTransformer?: DataTransformer,
    errorsTransformer?: ErrorsTransformer
  ) {
    this.fieldTransformer = fieldTransformer;
    this.fieldNodeTransformer = fieldNodeTransformer;
    this.dataTransformer = dataTransformer;
    this.errorsTransformer = errorsTransformer;
    this.mapping = {};
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    this.transformedSchema = mapSchema(originalSchema, {
      [MapperKind.OBJECT_TYPE]: (type: GraphQLObjectType) => this.transformFields(type, this.fieldTransformer),
      [MapperKind.INTERFACE_TYPE]: (type: GraphQLInterfaceType) => this.transformFields(type, this.fieldTransformer),
    });
    this.typeInfo = new TypeInfo(this.transformedSchema);

    return this.transformedSchema;
  }

  public transformRequest(
    originalRequest: Request,
    _delegationContext?: Record<string, any>,
    transformationContext?: Record<string, any>
  ): Request {
    const document = originalRequest.document;
    const fragments = Object.create(null);
    document.definitions.forEach(def => {
      if (def.kind === Kind.FRAGMENT_DEFINITION) {
        fragments[def.name.value] = def;
      }
    });
    return {
      ...originalRequest,
      document: this.transformDocument(document, fragments, transformationContext),
    };
  }

  public transformResult(
    result: ExecutionResult,
    _delegationContext?: Record<string, any>,
    transformationContext?: Record<string, any>
  ) {
    if (this.dataTransformer != null) {
      result.data = visitData(result.data, value => this.dataTransformer(value, transformationContext));
    }
    if (this.errorsTransformer != null) {
      result.errors = this.errorsTransformer(result.errors, transformationContext);
    }
    return result;
  }

  private transformFields(type: GraphQLObjectType, fieldTransformer: FieldTransformer): GraphQLObjectType;

  private transformFields(type: GraphQLInterfaceType, fieldTransformer: FieldTransformer): GraphQLInterfaceType;

  private transformFields(type: GraphQLObjectType | GraphQLInterfaceType, fieldTransformer: FieldTransformer): any {
    const config = type.toConfig();

    const originalFieldConfigMap = config.fields;
    const newFieldConfigMap = {};

    Object.keys(originalFieldConfigMap).forEach(fieldName => {
      const originalfieldConfig = originalFieldConfigMap[fieldName];
      const transformedField = fieldTransformer(type.name, fieldName, originalfieldConfig);

      if (transformedField === undefined) {
        newFieldConfigMap[fieldName] = originalfieldConfig;
      } else if (Array.isArray(transformedField)) {
        const newFieldName = transformedField[0];
        const newFieldConfig = transformedField[1];

        if (newFieldName !== fieldName) {
          const typeName = type.name;
          if (!(typeName in this.mapping)) {
            this.mapping[typeName] = {};
          }
          this.mapping[typeName][newFieldName] = fieldName;

          if (newFieldConfig.astNode != null) {
            newFieldConfig.astNode = {
              ...newFieldConfig.astNode,
              name: {
                ...newFieldConfig.astNode.name,
                value: newFieldName,
              },
            };
          }
        }

        newFieldConfigMap[newFieldName] = newFieldConfig;
      } else if (transformedField != null) {
        newFieldConfigMap[fieldName] = transformedField;
      }
    });

    if (!Object.keys(newFieldConfigMap).length) {
      return null;
    }

    if (isObjectType(type)) {
      const oldConfig = type.toConfig();
      return new GraphQLObjectType({
        ...oldConfig,
        fields: newFieldConfigMap,
        astNode: rebuildAstNode(oldConfig.astNode, oldConfig.extensionASTNodes, newFieldConfigMap),
        extensionASTNodes: [],
      });
    } else if (isInterfaceType(type)) {
      const oldConfig = type.toConfig();
      return new GraphQLInterfaceType({
        ...type.toConfig(),
        fields: newFieldConfigMap,
        astNode: rebuildAstNode(oldConfig.astNode, oldConfig.extensionASTNodes, newFieldConfigMap),
        extensionASTNodes: [],
      });
    }
  }

  private transformDocument(
    document: DocumentNode,
    fragments: Record<string, FragmentDefinitionNode>,
    transformationContext: Record<string, any>
  ): DocumentNode {
    return visit(
      document,
      visitWithTypeInfo(this.typeInfo, {
        leave: {
          [Kind.SELECTION_SET]: node =>
            this.transformSelectionSet(node, this.typeInfo, fragments, transformationContext),
        },
      })
    );
  }

  private transformSelectionSet(
    node: SelectionSetNode,
    typeInfo: TypeInfo,
    fragments: Record<string, FragmentDefinitionNode>,
    transformationContext: Record<string, any>
  ): SelectionSetNode {
    const parentType: GraphQLType = typeInfo.getParentType();
    if (parentType == null) {
      return undefined;
    }

    const parentTypeName = parentType.name;
    let newSelections: Array<SelectionNode> = [];

    node.selections.forEach(selection => {
      if (selection.kind !== Kind.FIELD) {
        newSelections.push(selection);
        return;
      }

      const newName = selection.name.value;

      if (this.dataTransformer != null || this.errorsTransformer != null) {
        newSelections.push({
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: '__typename',
          },
        });
      }

      let transformedSelection: SelectionNode | Array<SelectionNode>;
      if (this.fieldNodeTransformer == null) {
        transformedSelection = selection;
      } else {
        transformedSelection = this.fieldNodeTransformer(
          parentTypeName,
          newName,
          selection,
          fragments,
          transformationContext
        );
        transformedSelection = transformedSelection === undefined ? selection : transformedSelection;
      }

      if (Array.isArray(transformedSelection)) {
        newSelections = newSelections.concat(transformedSelection);
        return;
      }

      if (transformedSelection.kind !== Kind.FIELD) {
        newSelections.push(transformedSelection);
        return;
      }

      const typeMapping = this.mapping[parentTypeName];
      if (typeMapping == null) {
        newSelections.push(transformedSelection);
        return;
      }

      const oldName = this.mapping[parentTypeName][newName];
      if (oldName == null) {
        newSelections.push(transformedSelection);
        return;
      }

      newSelections.push({
        ...transformedSelection,
        name: {
          kind: Kind.NAME,
          value: oldName,
        },
        alias: {
          kind: Kind.NAME,
          value: newName,
        },
      });
    });

    return {
      ...node,
      selections: newSelections,
    };
  }
}

function rebuildAstNode<TypeDefinitionNode extends ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode>(
  astNode: TypeDefinitionNode,
  extensionASTNodes: ReadonlyArray<
    TypeDefinitionNode extends ObjectTypeDefinitionNode ? ObjectTypeExtensionNode : InterfaceTypeExtensionNode
  >,
  fieldConfigMap: Record<string, GraphQLFieldConfig<any, any>>
): TypeDefinitionNode {
  if (astNode == null && !extensionASTNodes.length) {
    return undefined;
  }

  let newAstNode: TypeDefinitionNode = {
    ...astNode,
    fields: undefined,
  };

  if (extensionASTNodes != null) {
    extensionASTNodes.forEach(node => {
      newAstNode = {
        ...newAstNode,
        ...node,
        kind: newAstNode.kind,
        fields: undefined,
      };
    });
  }

  const fields: Array<FieldDefinitionNode> = [];
  Object.values(fieldConfigMap).forEach(fieldConfig => {
    if (fieldConfig.astNode != null) {
      fields.push(fieldConfig.astNode);
    }
  });

  return {
    ...newAstNode,
    fields,
  };
}
