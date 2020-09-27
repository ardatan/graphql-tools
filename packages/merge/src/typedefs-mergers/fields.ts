import { Config } from './merge-typedefs';
import { FieldDefinitionNode, InputValueDefinitionNode, TypeNode, NameNode } from 'graphql';
import { extractType, isWrappingTypeNode, isListTypeNode, isNonNullTypeNode, printTypeNode } from './utils';
import { mergeDirectives } from './directives';
import { isNotEqual, compareNodes } from '@graphql-tools/utils';
import { mergeArguments } from './arguments';

type FieldDefNode = FieldDefinitionNode | InputValueDefinitionNode;
export type OnFieldTypeConflict = (existingField: FieldDefNode, otherField: FieldDefNode) => FieldDefNode | void;

function fieldAlreadyExists(fieldsArr: ReadonlyArray<FieldDefNode>, otherField: FieldDefNode): FieldDefNode {
  const result: FieldDefinitionNode | FieldDefNode | null = fieldsArr.find(
    field => field.name.value === otherField.name.value
  );

  return result;
}

export function mergeFields<T extends FieldDefinitionNode | InputValueDefinitionNode>(
  type: { name: NameNode },
  f1: ReadonlyArray<T>,
  f2: ReadonlyArray<T>,
  config: Config
): T[] {
  const result: T[] = [...f2];

  for (const field of f1) {
    let existing: any = fieldAlreadyExists(result, field);
    if (existing) {
      existing = preventConflicts(type, existing, field, !config?.throwOnConflict, config?.onFieldTypeConflict);

      existing.arguments = mergeArguments(field['arguments'] || [], existing.arguments || [], config);
      existing.directives = mergeDirectives(field.directives, existing.directives, config);
      existing.description = field.description || existing.description;
    } else {
      result.push(field);
    }
  }
  if (config?.sort) {
    result.sort(compareNodes);
  }
  if (config?.exclusions) {
    return result.filter(field => !config.exclusions.includes(`${type.name.value}.${field.name.value}`));
  }
  return result;
}

function preventConflicts(
  type: { name: NameNode },
  a: FieldDefinitionNode | InputValueDefinitionNode,
  b: FieldDefinitionNode | InputValueDefinitionNode,
  ignoreNullability = false,
  onFieldTypeConflict: OnFieldTypeConflict
) {
  const aType = printTypeNode(a.type);
  const bType = printTypeNode(b.type);

  if (isNotEqual(aType, bType)) {
    const t1 = extractType(a.type);
    const t2 = extractType(b.type);

    if (t1.name.value !== t2.name.value) {
      if (onFieldTypeConflict) {
        return onFieldTypeConflict(a, b) || a;
      }
      throw new Error(
        `Field "${b.name.value}" already defined with a different type. Declared as "${t1.name.value}", but you tried to override with "${t2.name.value}"`
      );
    }
    if (!safeChangeForFieldType(a.type, b.type, ignoreNullability)) {
      if (onFieldTypeConflict) {
        return onFieldTypeConflict(a, b) || a;
      }
      throw new Error(`Field '${type.name.value}.${a.name.value}' changed type from '${aType}' to '${bType}'`);
    }
  }

  if (isNonNullTypeNode(b.type) && !isNonNullTypeNode(a.type)) {
    (a as any).type = b.type;
  }

  return a;
}

function safeChangeForFieldType(oldType: TypeNode, newType: TypeNode, ignoreNullability = false): boolean {
  // both are named
  if (!isWrappingTypeNode(oldType) && !isWrappingTypeNode(newType)) {
    return oldType.toString() === newType.toString();
  }

  // new is non-null
  if (isNonNullTypeNode(newType)) {
    const ofType = isNonNullTypeNode(oldType) ? oldType.type : oldType;

    return safeChangeForFieldType(ofType, newType.type);
  }

  // old is non-null
  if (isNonNullTypeNode(oldType)) {
    return safeChangeForFieldType(newType, oldType, ignoreNullability);
  }

  // old is list
  if (isListTypeNode(oldType)) {
    return (
      (isListTypeNode(newType) && safeChangeForFieldType(oldType.type, newType.type)) ||
      (isNonNullTypeNode(newType) && safeChangeForFieldType(oldType, newType['type']))
    );
  }

  return false;
}
