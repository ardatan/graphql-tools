import { GraphQLResolveInfo } from 'graphql';

export type SchemaLink = {
  name: string;
  from: string;
  to: string;
  args?: Array<string>;
  fragment?: string;
  resolveArgs?: (
    source: any,
    args: { [argName: string]: any },
    context: any,
    info: GraphQLResolveInfo,
  ) => { [key: string]: any };
  inlineFragment?: any;
};
