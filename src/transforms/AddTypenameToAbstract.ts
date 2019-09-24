import { GraphQLSchema } from 'graphql';
import { Request } from '../Interfaces';
import { Transform } from './transforms';
import { addTypenameToAbstract } from '../stitching/addTypeNameToAbstract';

export default class AddTypenameToAbstract implements Transform {
  private targetSchema: GraphQLSchema;

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
