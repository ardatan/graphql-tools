/* eslint-disable no-eval */
import { buildASTSchema, DocumentNode, parse, SchemaDefinitionNode, visit } from 'graphql';
import { MergedTypeConfig, SubschemaConfig } from '@graphql-tools/delegate';
import { Executor } from '@graphql-tools/utils';
import { stitchSchemas } from './stitchSchemas.js';

export function createStichedSchemaFromSdl(
  sdl: string | DocumentNode,
  subschemaExecutorMap: Map<string, Executor>,
) {
  const documentNode = typeof sdl === 'string' ? parse(sdl) : sdl;
  const { subschemaNames } = extractSubschemaNamesAndExecutors(documentNode);
  const subschemas: SubschemaConfig[] = [];
  for (const subschemaName of subschemaNames) {
    let mergedTypeConfigMap: Record<string, MergedTypeConfig> | undefined;
    const schemaAst = visit(documentNode, {
      ObjectTypeDefinition: {
        enter(node) {
          for (const directiveNode of node.directives ?? []) {
            if (directiveNode.name.value === 'subschemaObjectType') {
              const subschemaArg = directiveNode.arguments?.find(
                arg => arg.name.value === 'subschema',
              );
              const subschemaArgValue = subschemaArg?.value;
              if (
                subschemaArgValue?.kind === 'StringValue' &&
                subschemaArgValue.value === subschemaName
              ) {
                const implementsArg = directiveNode.arguments?.find(
                  arg => arg.name.value === 'implements',
                );
                const implementsArgValue = implementsArg?.value;
                if (implementsArgValue?.kind === 'ListValue') {
                  const interfaces = implementsArgValue.values.map(value => {
                    if (value.kind === 'StringValue') {
                      return value.value;
                    }
                    throw new Error(`Expected interface name to be a string, found ${value.kind}`);
                  });
                  return {
                    ...node,
                    interfaces: node.interfaces?.filter(iface =>
                      interfaces.includes(iface.name.value),
                    ),
                  };
                }
                return node;
              }
            }
          }
          return null;
        },
        leave(node) {
          for (const directiveNode of node.directives ?? []) {
            if (directiveNode.name.value === 'merge') {
              const subschemaArg = directiveNode.arguments?.find(
                arg => arg.name.value === 'subschema',
              );
              const subschemaArgValue = subschemaArg?.value;
              if (
                subschemaArgValue?.kind === 'StringValue' &&
                subschemaArgValue.value === subschemaName
              ) {
                const mergedTypeConfig: MergedTypeConfig = {};
                for (const argumentNode of directiveNode.arguments ?? []) {
                  if (argumentNode.name.value === 'selectionSet') {
                    const selectionSetArgValue = argumentNode.value;
                    if (selectionSetArgValue.kind === 'StringValue') {
                      mergedTypeConfig.selectionSet = selectionSetArgValue.value;
                    }
                  } else if (argumentNode.name.value === 'fieldName') {
                    const fieldNameArgValue = argumentNode.value;
                    if (fieldNameArgValue.kind === 'StringValue') {
                      mergedTypeConfig.fieldName = fieldNameArgValue.value;
                    }
                  } else if (argumentNode.name.value === 'key') {
                    const keyArgValue = argumentNode.value;
                    if (keyArgValue.kind === 'StringValue') {
                      mergedTypeConfig.key = eval(keyArgValue.value) as any;
                    }
                  } else if (argumentNode.name.value === 'argsFromKeys') {
                    const argsFromKeysArgValue = argumentNode.value;
                    if (argsFromKeysArgValue.kind === 'StringValue') {
                      mergedTypeConfig.argsFromKeys = eval(argsFromKeysArgValue.value) as any;
                    }
                  }
                }
                const typeName = node.name.value;
                mergedTypeConfigMap ||= {};
                mergedTypeConfigMap[typeName] = mergedTypeConfig;
              }
            }
          }
        },
      },
      InterfaceTypeDefinition: {
        enter(node) {
          for (const directiveNode of node.directives ?? []) {
            if (directiveNode.name.value === 'subschemaInterfaceType') {
              const subschemaArg = directiveNode.arguments?.find(
                arg => arg.name.value === 'subschema',
              );
              const subschemaArgValue = subschemaArg?.value;
              if (
                subschemaArgValue?.kind === 'StringValue' &&
                subschemaArgValue.value === subschemaName
              ) {
                const implementsArg = directiveNode.arguments?.find(
                  arg => arg.name.value === 'implements',
                );
                const implementsArgValue = implementsArg?.value;
                if (implementsArgValue?.kind === 'ListValue') {
                  const interfaces = implementsArgValue.values.map(value => {
                    if (value.kind === 'StringValue') {
                      return value.value;
                    }
                    throw new Error(`Expected interface name to be a string, found ${value.kind}`);
                  });
                  return {
                    ...node,
                    interfaces: node.interfaces?.filter(
                      iface => !interfaces.includes(iface.name.value),
                    ),
                  };
                }
                return node;
              }
            }
          }
          return null;
        },
      },
      InputObjectTypeDefinition: {
        enter(node) {
          for (const directiveNode of node.directives ?? []) {
            if (directiveNode.name.value === 'subschemaInputObjectType') {
              const subschemaArg = directiveNode.arguments?.find(
                arg => arg.name.value === 'subschema',
              );
              const subschemaArgValue = subschemaArg?.value;
              if (
                subschemaArgValue?.kind === 'StringValue' &&
                subschemaArgValue.value === subschemaName
              ) {
                return node;
              }
            }
          }
          return null;
        },
      },
      FieldDefinition: {
        enter(node) {
          for (const directiveNode of node.directives || []) {
            if (
              directiveNode.name.value === 'subschemaObjectField' ||
              directiveNode.name.value === 'subschemaInterfaceField' ||
              directiveNode.name.value === 'subschemaInputObjectField'
            ) {
              const subschemaArg = directiveNode.arguments?.find(
                arg => arg.name.value === 'subschema',
              );
              const subschemaArgValue = subschemaArg?.value;
              if (
                subschemaArgValue?.kind === 'StringValue' &&
                subschemaArgValue.value === subschemaName
              ) {
                return {
                  ...node,
                  arguments: node.arguments?.filter(arg => {
                    const argSubschemaDirective = arg.directives?.find(
                      directive => directive.name.value === 'subschemaArgument',
                    );
                    const argSubschemaArg = argSubschemaDirective?.arguments?.find(
                      arg => arg.name.value === 'subschema',
                    );
                    const argSubschemaArgValue = argSubschemaArg?.value;
                    if (
                      argSubschemaArgValue?.kind === 'StringValue' &&
                      argSubschemaArgValue.value === subschemaName
                    ) {
                      return true;
                    }
                    return false;
                  }),
                };
              }
            }
          }
          return null;
        },
      },
      UnionTypeDefinition: {
        enter(node) {
          for (const directiveNode of node.directives ?? []) {
            if (directiveNode.name.value === 'subschemaUnionType') {
              const subschemaArg = directiveNode.arguments?.find(
                arg => arg.name.value === 'subschema',
              );
              const subschemaArgValue = subschemaArg?.value;
              if (
                subschemaArgValue?.kind === 'StringValue' &&
                subschemaArgValue.value === subschemaName
              ) {
                const typesArg = directiveNode.arguments?.find(arg => arg.name.value === 'types');
                const typesArgValue = typesArg?.value;
                if (typesArgValue?.kind === 'ListValue') {
                  const types = typesArgValue.values.map(value => {
                    if (value.kind === 'StringValue') {
                      return value.value;
                    }
                    throw new Error(`Expected type name to be a string, found ${value.kind}`);
                  });
                  return {
                    ...node,
                    types: node.types?.filter(type => !types.includes(type.name.value)),
                  };
                }
              }
            }
          }
          return null;
        },
      },
      ScalarTypeDefinition: {
        enter(node) {
          for (const directiveNode of node.directives ?? []) {
            if (directiveNode.name.value === 'subschemaScalarType') {
              const subschemaArg = directiveNode.arguments?.find(
                arg => arg.name.value === 'subschema',
              );
              const subschemaArgValue = subschemaArg?.value;
              if (
                subschemaArgValue?.kind === 'StringValue' &&
                subschemaArgValue.value === subschemaName
              ) {
                return node;
              }
            }
          }
          return null;
        },
      },
      EnumTypeDefinition: {
        enter(node) {
          for (const directiveNode of node.directives ?? []) {
            if (directiveNode.name.value === 'subschemaEnumType') {
              const subschemaArg = directiveNode.arguments?.find(
                arg => arg.name.value === 'subschema',
              );
              const subschemaArgValue = subschemaArg?.value;
              if (
                subschemaArgValue?.kind === 'StringValue' &&
                subschemaArgValue.value === subschemaName
              ) {
                return node;
              }
            }
          }
          return null;
        },
      },
      EnumValueDefinition: {
        enter(node) {
          for (const directiveNode of node.directives ?? []) {
            if (directiveNode.name.value === 'subschemaEnumValue') {
              const subschemaArg = directiveNode.arguments?.find(
                arg => arg.name.value === 'subschema',
              );
              const subschemaArgValue = subschemaArg?.value;
              if (
                subschemaArgValue?.kind === 'StringValue' &&
                subschemaArgValue.value === subschemaName
              ) {
                return node;
              }
            }
          }
          return null;
        },
      },
    });
    const schema = buildASTSchema(schemaAst, {
      assumeValid: true,
      assumeValidSDL: true,
    });
    subschemas.push({
      name: subschemaName,
      schema,
      merge: mergedTypeConfigMap,
      executor: subschemaExecutorMap.get(subschemaName),
    });
  }
  return stitchSchemas({
    subschemas,
  });
}

function extractSubschemaNamesAndExecutors(documentNode: DocumentNode) {
  const schemaDef = documentNode.definitions.find(
    def => def.kind === 'SchemaDefinition',
  ) as SchemaDefinitionNode;
  const subschemaNames = new Set<string>();
  const subschemaNameExecutorMap = new Map<string, string>();
  if (schemaDef) {
    schemaDef.directives?.forEach(directive => {
      if (directive.name.value === 'subschema') {
        const subschemaNameArg = directive.arguments?.find(arg => arg.name.value === 'subschema');
        if (subschemaNameArg) {
          const subschemaNameArgValue = subschemaNameArg.value;
          if (subschemaNameArgValue.kind === 'StringValue') {
            const subschemaName = subschemaNameArgValue.value;
            subschemaNames.add(subschemaName);
            const executorArg = directive.arguments?.find(arg => arg.name.value === 'executor');
            if (executorArg) {
              const executorArgValue = executorArg.value;
              if (executorArgValue.kind === 'StringValue') {
                subschemaNameExecutorMap.set(subschemaName, executorArgValue.value);
              } else {
                throw new Error(`Expected executor to be a string, found ${executorArgValue.kind}`);
              }
            }
          } else {
            throw new Error(
              `Expected subschema name to be a string, found ${subschemaNameArgValue.kind}`,
            );
          }
        }
      }
    });
  }
  return { subschemaNames, subschemaNameExecutorMap };
}
