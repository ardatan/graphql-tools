import { DocumentNode } from '@graphql-tools/graphql';

export type DocumentOptimizer = (input: DocumentNode) => DocumentNode;
