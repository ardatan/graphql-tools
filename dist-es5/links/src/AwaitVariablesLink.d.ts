/// <reference types="zen-observable" />
import { ApolloLink, FetchResult, NextLink, Operation } from '@apollo/client/link/core';
import { Observable } from '@apollo/client/utilities';
export declare class AwaitVariablesLink extends ApolloLink {
  request(operation: Operation, forward: NextLink): Observable<FetchResult>;
}
