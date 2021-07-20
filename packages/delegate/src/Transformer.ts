import { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';

import { DelegationContext, DelegationBinding, Transform } from './types';

import { defaultDelegationBinding } from './delegationBindings';
import { prepareGatewayDocument } from './prepareGatewayDocument';
import { finalizeGatewayRequest } from './finalizeGatewayRequest';

interface Transformation {
  transform: Transform;
  context: Record<string, any>;
}

export class Transformer<TContext = Record<string, any>> {
  private transformations: Array<Transformation> = [];
  private delegationContext: DelegationContext<any>;

  constructor(context: DelegationContext<TContext>, binding: DelegationBinding<TContext> = defaultDelegationBinding) {
    this.delegationContext = context;
    const delegationTransforms: Array<Transform> = binding(this.delegationContext);
    for (const transform of delegationTransforms) {
      this.addTransform(transform, {});
    }
  }

  private addTransform(transform: Transform, context = {}) {
    this.transformations.push({ transform, context });
  }

  public transformRequest(originalRequest: ExecutionRequest) {
    const preparedRequest = {
      ...originalRequest,
      document: prepareGatewayDocument(originalRequest.document, this.delegationContext),
    };

    const transformedRequest = this.transformations.reduce(
      (request: ExecutionRequest, transformation: Transformation) =>
        transformation.transform.transformRequest != null
          ? transformation.transform.transformRequest(request, this.delegationContext, transformation.context)
          : request,
      preparedRequest
    );

    return finalizeGatewayRequest(transformedRequest, this.delegationContext);
  }

  public transformResult(originalResult: ExecutionResult) {
    return this.transformations.reduceRight(
      (result: ExecutionResult, transformation: Transformation) =>
        transformation.transform.transformResult != null
          ? transformation.transform.transformResult(result, this.delegationContext, transformation.context)
          : result,
      originalResult
    );
  }
}
