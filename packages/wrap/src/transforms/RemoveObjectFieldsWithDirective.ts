import { GraphQLSchema } from 'graphql';

import { getDirectives, valueMatchesCriteria } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from '@graphql-tools/delegate';

import FilterObjectFields from './FilterObjectFields.js';

interface RemoveObjectFieldsWithDirectiveTransformationContext extends Record<string, any> {}

export default class RemoveObjectFieldsWithDirective<TContext = Record<string, any>>
  implements Transform<RemoveObjectFieldsWithDirectiveTransformationContext, TContext>
{
  private readonly directiveName: string | RegExp;
  private readonly args: Record<string, any>;

  constructor(directiveName: string | RegExp, args: Record<string, any> = {}) {
    this.directiveName = directiveName;
    this.args = args;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>
  ): GraphQLSchema {
    const transformer = new FilterObjectFields<TContext>((_typeName, _fieldName, fieldConfig) => {
      const directives = getDirectives(originalWrappingSchema, fieldConfig);
      return !directives.some(
        directive =>
          valueMatchesCriteria(directive.name, this.directiveName) && valueMatchesCriteria(directive.args, this.args)
      );
    });

    return transformer.transformSchema(originalWrappingSchema, subschemaConfig);
  }
}
