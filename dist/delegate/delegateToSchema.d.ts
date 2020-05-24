import { GraphQLSchema } from 'graphql';
import { IDelegateToSchemaOptions, IDelegateRequestOptions } from '../Interfaces';
export default function delegateToSchema(options: IDelegateToSchemaOptions | GraphQLSchema): any;
export declare function delegateRequest({ request, schema: subschemaOrSubschemaConfig, rootValue, info, operation, fieldName, args, returnType, context, transforms, skipValidation, skipTypeMerging, }: IDelegateRequestOptions): any;
