import {
  ArgumentNode,
  DirectiveDefinitionNode,
  DirectiveNode,
  Kind,
  ListValueNode,
  NameNode,
  ValueNode,
} from 'graphql';
import { Config } from './merge-typedefs.js';

function isRepeatableDirective(
  directive: DirectiveNode,
  directives?: Record<string, DirectiveDefinitionNode>,
  repeatableLinkImports?: Set<string>,
): boolean {
  return !!(
    directives?.[directive.name.value]?.repeatable ??
    repeatableLinkImports?.has(directive.name.value)
  );
}

function nameAlreadyExists(name: NameNode, namesArr: ReadonlyArray<NameNode>): boolean {
  return namesArr.some(({ value }) => value === name.value);
}

function mergeArguments(a1: readonly ArgumentNode[], a2: readonly ArgumentNode[]): ArgumentNode[] {
  const result: ArgumentNode[] = [];

  for (const argument of [...a2, ...a1]) {
    const existingIndex = result.findIndex(a => a.name.value === argument.name.value);

    if (existingIndex === -1) {
      result.push(argument);
    } else {
      const existingArg = result[existingIndex];

      if (existingArg.value.kind === 'ListValue') {
        const source = (existingArg.value as any).values;
        const target = (argument.value as ListValueNode).values;

        // merge values of two lists
        (existingArg.value as ListValueNode) = {
          ...existingArg.value,
          values: deduplicateLists(source, target, (targetVal, source) => {
            const value = (targetVal as any).value;
            return !value || !source.some((sourceVal: any) => sourceVal.value === value);
          }),
        };
      } else {
        (existingArg as any).value = argument.value;
      }
    }
  }

  return result;
}

const matchValues = (a: ValueNode, b: ValueNode): boolean => {
  if (a.kind === b.kind) {
    switch (a.kind) {
      case Kind.LIST:
        return (
          a.values.length === (b as typeof a).values.length &&
          a.values.every(aVal => (b as typeof a).values.find(bVal => matchValues(aVal, bVal)))
        );
      case Kind.VARIABLE:
      case Kind.NULL:
        return true;
      case Kind.OBJECT:
        return (
          a.fields.length === (b as typeof a).fields.length &&
          a.fields.every(aField =>
            (b as typeof a).fields.find(
              bField =>
                aField.name.value === bField.name.value && matchValues(aField.value, bField.value),
            ),
          )
        );
      default:
        return a.value === (b as typeof a).value;
    }
  }
  return false;
};

const matchArguments = (a: ArgumentNode, b: ArgumentNode): boolean =>
  a.name.value === b.name.value && a.value.kind === b.value.kind && matchValues(a.value, b.value);

/**
 * Check if a directive is an exact match of another directive based on their
 * arguments.
 */
const matchDirectives = (a: DirectiveNode, b: DirectiveNode): boolean => {
  const matched =
    a.name.value === b.name.value &&
    (a.arguments === b.arguments ||
      (a.arguments?.length === b.arguments?.length &&
        a.arguments?.every(argA => b.arguments?.find(argB => matchArguments(argA, argB)))));
  return !!matched;
};

export function mergeDirectives(
  d1: ReadonlyArray<DirectiveNode> = [],
  d2: ReadonlyArray<DirectiveNode> = [],
  config?: Config,
  directives?: Record<string, DirectiveDefinitionNode>,
): DirectiveNode[] {
  const reverseOrder: boolean | undefined = config && config.reverseDirectives;
  const asNext = reverseOrder ? d1 : d2;
  const asFirst = reverseOrder ? d2 : d1;
  const result: DirectiveNode[] = [];
  for (const directive of [...asNext, ...asFirst]) {
    if (isRepeatableDirective(directive, directives, config?.repeatableLinkImports)) {
      // look for repeated, identical directives that come before this instance
      // if those exist, return null so that this directive gets removed.
      const exactDuplicate = result.find(d => matchDirectives(directive, d));
      if (!exactDuplicate) {
        result.push(directive);
      }
    } else {
      const firstAt = result.findIndex(d => d.name.value === directive.name.value);
      if (firstAt === -1) {
        // if did not find a directive with this name on the result set already
        result.push(directive);
      } else {
        // if not repeatable and found directive with the same name already in the result set,
        // then merge the arguments of the existing directive and the new directive
        const mergedArguments = mergeArguments(
          directive.arguments ?? [],
          result[firstAt].arguments ?? [],
        );
        result[firstAt] = {
          ...result[firstAt],
          arguments: mergedArguments.length === 0 ? undefined : mergedArguments,
        };
      }
    }
  }

  return result;
}

export function mergeDirective(
  node: DirectiveDefinitionNode,
  existingNode?: DirectiveDefinitionNode,
): DirectiveDefinitionNode {
  if (existingNode) {
    return {
      ...node,
      arguments: deduplicateLists(
        existingNode.arguments || [],
        node.arguments || [],
        (arg, existingArgs) =>
          !nameAlreadyExists(
            arg.name,
            existingArgs.map(a => a.name),
          ),
      ),
      locations: [
        ...existingNode.locations,
        ...node.locations.filter(name => !nameAlreadyExists(name, existingNode.locations)),
      ],
    };
  }

  return node;
}

function deduplicateLists<T>(
  source: readonly T[],
  target: readonly T[],
  filterFn: (val: T, source: readonly T[]) => boolean,
): T[] {
  return source.concat(target.filter(val => filterFn(val, source)));
}
