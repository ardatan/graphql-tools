import { NamedDefinitionNode } from "@graphql-tools/utils";
import { ConstDirectiveNode, DocumentNode } from "graphql";

// Query planner types
export type PlanNode = ResolveNode | SequenceNode | ParallelNode;

export interface ResolveNode {
  type: 'Resolve',
  subgraph: string;
  document: DocumentNode;
  provided?: {
    variables?: Map<string, string[]>;
    selections?: Map<string, string[]>;
    selectionFields?: Map<string, Map<string, string[]>>;
  },
  required?: {
    variables?: string[];
    selections?: Map<string, string[]>;
  },
}

export interface SequenceNode {
  type: 'Sequence',
  nodes: PlanNode[];
}

export interface ParallelNode {
  type: 'Parallel',
  nodes: PlanNode[];
}


// Schema types

export type NamedDefinitionNodeWithDirectives = NamedDefinitionNode & { directives?: readonly ConstDirectiveNode[] };

export enum ResolverKind {
  FETCH,
  BATCH,
  SUBSCRIBE
}

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
