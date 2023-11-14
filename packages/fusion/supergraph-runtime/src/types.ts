import { ConstDirectiveNode, DocumentNode, parse, print } from 'graphql';
import { NamedDefinitionNode } from '@graphql-tools/utils';
import { ResolverOperationNode } from './query-planning.js';

// Query planner types
export type PlanNode = ResolveNode | SequenceNode | ParallelNode;

export interface ResolveNode {
  type: 'Resolve';
  subgraph: string;
  document: DocumentNode;
  provided?: {
    selections?: Map<string, string[]>;
    variablesInSelections?: Map<string, Map<string, string[]>>;
    selectionFields?: Map<string, Map<string, string[]>>;
  };
  required?: {
    variables?: string[];
    selections?: Map<string, string[]>;
  };
  batch?: boolean;
}

export interface SequenceNode {
  type: 'Sequence';
  nodes: PlanNode[];
}

export interface ParallelNode {
  type: 'Parallel';
  nodes: PlanNode[];
}

// Schema types

export type NamedDefinitionNodeWithDirectives = NamedDefinitionNode & {
  directives?: readonly ConstDirectiveNode[];
};

export type ResolverKind = 'FETCH' | 'BATCH' | 'SUBSCRIBE';

export interface ResolverVariableConfig {
  name: string;
  select?: string;
  subgraph: string;
}

export interface ResolverConfig {
  operation: string;
  kind: ResolverKind;
  subgraph: string;
}

// Query Planning Types

export interface SerializedResolverOperationNode {
  subgraph: string;
  resolverOperationDocument: string;
  resolverDependencies?: SerializedResolverOperationNode[];
  resolverDependencyFieldMap?: Record<string, SerializedResolverOperationNode[]>;
  batch?: boolean;
}

export function serializeResolverOperationNode(resolverOperationNode: ResolverOperationNode) {
  const serializedNode: SerializedResolverOperationNode = {
    subgraph: resolverOperationNode.subgraph,
    resolverOperationDocument: print(resolverOperationNode.resolverOperationDocument),
  };

  if (resolverOperationNode.resolverDependencies.length) {
    serializedNode['resolverDependencies'] = resolverOperationNode.resolverDependencies.map(
      serializeResolverOperationNode,
    );
  }
  if (resolverOperationNode.resolverDependencyFieldMap.size) {
    serializedNode['resolverDependencyFieldMap'] = Object.fromEntries(
      [...resolverOperationNode.resolverDependencyFieldMap.entries()].map(([key, value]) => [
        key,
        value.map(serializeResolverOperationNode),
      ]),
    );
  }

  if (resolverOperationNode.batch) {
    serializedNode['batch'] = true;
  }

  return serializedNode;
}

export function deserializeResolverOperationNode(
  serializedResolverOperationNode: SerializedResolverOperationNode,
): ResolverOperationNode {
  const resolverOperationNode = {
    subgraph: serializedResolverOperationNode.subgraph,
    resolverOperationDocument: parse(serializedResolverOperationNode.resolverOperationDocument),
  } as ResolverOperationNode;

  if (serializedResolverOperationNode.resolverDependencies) {
    resolverOperationNode.resolverDependencies =
      serializedResolverOperationNode.resolverDependencies.map(deserializeResolverOperationNode);
  } else {
    resolverOperationNode.resolverDependencies = [];
  }

  if (serializedResolverOperationNode.resolverDependencyFieldMap) {
    resolverOperationNode.resolverDependencyFieldMap = new Map(
      Object.entries(serializedResolverOperationNode.resolverDependencyFieldMap).map(
        ([key, value]) => [key, value.map(deserializeResolverOperationNode)],
      ),
    );
  } else {
    resolverOperationNode.resolverDependencyFieldMap = new Map();
  }

  if (serializedResolverOperationNode.batch) {
    resolverOperationNode.batch = true;
  }

  return resolverOperationNode;
}
