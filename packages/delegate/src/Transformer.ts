import { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';

import { DelegationContext, Transform } from './types';

import { prepareGatewayDocument } from './prepareGatewayDocument';
import { finalizeGatewayRequest } from './finalizeGatewayRequest';
import { checkResultAndHandleErrors } from './checkResultAndHandleErrors';

interface Transformation<TContext> {
  transform: Transform<any, TContext>;
  context: Record<string, any>;
}

export class Transformer<TContext = Record<string, any>> {
  private transformations: Array<Transformation<TContext>> = [];
  private delegationContext: DelegationContext<TContext>;

  constructor(context: DelegationContext<TContext>) {
    this.delegationContext = context;
    const transforms = context.transforms;
    const delegationTransforms = transforms.slice().reverse();
    for (const transform of delegationTransforms) {
      this.addTransform(transform, {});
    }
  }

  private addTransform(transform: Transform<any, TContext>, context = {}) {
    this.transformations.push({ transform, context });
  }

  public transformRequest(originalRequest: ExecutionRequest): ExecutionRequest {
    let request = {
      ...originalRequest,
      document: prepareGatewayDocument(
        originalRequest.document,
        this.delegationContext.transformedSchema,
        this.delegationContext.returnType,
        this.delegationContext.info?.schema
      ),
    };

    for (const transformation of this.transformations) {
      if (transformation.transform.transformRequest) {
        request = transformation.transform.transformRequest(request, this.delegationContext, transformation.context);
      }
    }

    return finalizeGatewayRequest(request, this.delegationContext);
  }

  public transformResult(originalResult: ExecutionResult) {
    let result = originalResult;

    // from rigth to left
    for (let i = this.transformations.length - 1; i >= 0; i--) {
      const transformation = this.transformations[i];
      if (transformation.transform.transformResult) {
        result = transformation.transform.transformResult(result, this.delegationContext, transformation.context);
      }
    }

    return checkResultAndHandleErrors(result, this.delegationContext);
  }
}
