import {
  DirectiveNode,
  DocumentNode,
  FieldNode,
  FragmentSpreadNode,
  InlineFragmentNode,
  Kind,
  SelectionSetNode,
  visit,
} from 'graphql';

import { Request } from '@graphql-tools/utils';

import { Transform, DelegationContext } from '../types';

export default class StoreAsyncSelectionSets implements Transform {
  private labelNumber: number;

  constructor() {
    this.labelNumber = 0;
  }

  public transformRequest(
    originalRequest: Request,
    delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): Request {
    const { asyncSelectionSets } = delegationContext;
    return {
      ...originalRequest,
      document: this.storeAsyncSelectionSets(originalRequest.document, asyncSelectionSets),
    };
  }

  private storeAsyncSelectionSets(
    document: DocumentNode,
    asyncSelectionSets: Record<string, SelectionSetNode>
  ): DocumentNode {
    const fragmentSelectionSets: Record<string, SelectionSetNode> = Object.create(null);

    document.definitions.forEach(def => {
      if (def.kind === Kind.FRAGMENT_DEFINITION) {
        fragmentSelectionSets[def.name.value] = filterSelectionSet(def.selectionSet);
      }
    });

    return visit(document, {
      [Kind.FIELD]: node => {
        const newNode = transformFieldNode(node, this.labelNumber);

        if (newNode === undefined) {
          return;
        }

        if (node.selectionSet !== undefined) {
          asyncSelectionSets[`label_${this.labelNumber}`] = filterSelectionSet(node.selectionSet);
        }

        this.labelNumber++;

        return newNode;
      },
      [Kind.INLINE_FRAGMENT]: node => {
        const newNode = transformFragmentNode(node, this.labelNumber);

        if (newNode === undefined) {
          return;
        }

        asyncSelectionSets[`label_${this.labelNumber}`] = filterSelectionSet(node.selectionSet);

        this.labelNumber++;

        return newNode;
      },
      [Kind.FRAGMENT_SPREAD]: node => {
        const newNode = transformFragmentNode(node, this.labelNumber);

        if (newNode === undefined) {
          return;
        }

        asyncSelectionSets[this.labelNumber] = fragmentSelectionSets[node.name.value];

        this.labelNumber++;

        return newNode;
      },
    });
  }
}

function transformFragmentNode<T extends InlineFragmentNode | FragmentSpreadNode>(node: T, labelNumber: number): T {
  const deferIndex = node.directives?.findIndex(directive => directive.name.value === 'defer');
  if (deferIndex === undefined || deferIndex === -1) {
    return;
  }

  const defer = node.directives[deferIndex];

  let newDefer: DirectiveNode;

  const args = defer.arguments;
  const labelIndex = args?.findIndex(arg => arg.name.value === 'label');
  const newLabel = {
    kind: Kind.ARGUMENT,
    name: {
      kind: Kind.NAME,
      value: 'label',
    },
    value: {
      kind: Kind.STRING,
      value: `label_${labelNumber}`,
    },
  };

  if (labelIndex === undefined) {
    newDefer = {
      ...defer,
      arguments: [newLabel],
    };
  } else if (labelIndex === -1) {
    newDefer = {
      ...defer,
      arguments: [...args, newLabel],
    };
  } else {
    const newArgs = args.slice();
    newArgs.splice(labelIndex, 1, newLabel);
    newDefer = {
      ...defer,
      arguments: newArgs,
    };
  }

  const newDirectives = node.directives.slice();
  newDirectives.splice(deferIndex, 1, newDefer);

  return {
    ...node,
    directives: newDirectives,
  };
}

function transformFieldNode(node: FieldNode, labelNumber: number): FieldNode {
  const streamIndex = node.directives?.findIndex(directive => directive.name.value === 'stream');
  if (streamIndex === undefined || streamIndex === -1) {
    return;
  }

  const stream = node.directives[streamIndex];

  let newStream: DirectiveNode;

  const args = stream.arguments;
  const labelIndex = args?.findIndex(arg => arg.name.value === 'label');
  const newLabel = {
    kind: Kind.ARGUMENT,
    name: {
      kind: Kind.NAME,
      value: 'label',
    },
    value: {
      kind: Kind.STRING,
      value: `label_${labelNumber}`,
    },
  };

  if (labelIndex === undefined) {
    newStream = {
      ...stream,
      arguments: [newLabel],
    };
  } else if (labelIndex === -1) {
    newStream = {
      ...stream,
      arguments: [...args, newLabel],
    };
  } else {
    const newArgs = args.slice();
    newArgs.splice(labelIndex, 1, newLabel);
    newStream = {
      ...stream,
      arguments: newArgs,
    };
  }

  const newDirectives = node.directives.slice();
  newDirectives.splice(streamIndex, 1, newStream);

  return {
    ...node,
    directives: newDirectives,
  };
}

function filterSelectionSet(selectionSet: SelectionSetNode): SelectionSetNode {
  return {
    ...selectionSet,
    selections: selectionSet.selections.filter(
      selection =>
        selection.directives === undefined || !selection.directives.some(directive => directive.name.value === 'defer')
    ),
  };
}
