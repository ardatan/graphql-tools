import { GraphQLSchema } from 'graphql';

import { Transform, Request } from '../../Interfaces';
import { addTypenameToAbstract } from '../../delegate/addTypenameToAbstract';

export default class AddTypenameToAbstract implements Transform {
  private readonly targetSchema: GraphQLSchema;

  constructor(targetSchema: GraphQLSchema) {
    this.targetSchema = targetSchema;
  }

  public transformRequest(originalRequest: Request): Request {
    const document = addTypenameToAbstract(
      this.targetSchema,
      originalRequest.document,
    );
    return {
      ...originalRequest,
      document,
    };
  }
}
