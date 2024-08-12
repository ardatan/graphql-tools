import type { ASTNode, DirectiveNode, GraphQLSchema } from 'graphql';
import { valueFromAST, valueFromASTUntyped } from 'graphql';
import { getArgumentValues } from './getArgumentValues.js';

export type DirectableASTNode = ASTNode & { directives?: readonly DirectiveNode[] };
export type DirectableObject = {
  astNode?: DirectableASTNode | null;
  extensionASTNodes?: readonly DirectableASTNode[] | null;
  extensions?: { directives?: Record<string, any> } | null;
};

export function getDirectiveExtensions<
  TDirectiveAnnotationsMap extends {
    [directiveName: string]: {
      [paramName: string]: any;
    };
  },
>(
  directableObj: DirectableObject,
  schema?: GraphQLSchema,
  pathToDirectivesInExtensions: string[] = ['directives'],
) {
  const directiveExtensions: {
    [directiveName in keyof TDirectiveAnnotationsMap]?: Array<
      TDirectiveAnnotationsMap[directiveName]
    >;
  } = {};
  const astNodes: DirectableASTNode[] = [];
  if (directableObj.astNode) {
    astNodes.push(directableObj.astNode);
  }
  if (directableObj.extensionASTNodes) {
    astNodes.push(...directableObj.extensionASTNodes);
  }
  for (const astNode of astNodes) {
    if (astNode.directives?.length) {
      for (const directive of astNode.directives) {
        const directiveName: keyof TDirectiveAnnotationsMap = directive.name.value;
        let existingDirectiveExtensions = directiveExtensions[directiveName];
        if (!existingDirectiveExtensions) {
          existingDirectiveExtensions = [];
          directiveExtensions[directiveName] = existingDirectiveExtensions;
        }
        const directiveInSchema = schema?.getDirective(directiveName);
        let value: any = {};
        if (directiveInSchema) {
          value = getArgumentValues(directiveInSchema, directive);
        }
        if (directive.arguments) {
          for (const argNode of directive.arguments) {
            const argName = argNode.name.value;
            if (value[argName] == null) {
              const argInDirective = directiveInSchema?.args.find(arg => arg.name === argName);
              if (argInDirective) {
                value[argName] = valueFromAST(argNode.value, argInDirective.type);
              }
            }
            if (value[argName] == null) {
              value[argName] = valueFromASTUntyped(argNode.value);
            }
          }
        }
        existingDirectiveExtensions.push(value);
      }
    }
  }

  if (directableObj.extensions) {
    let directivesInExtensions = directableObj.extensions;
    for (const pathSegment of pathToDirectivesInExtensions) {
      directivesInExtensions = directivesInExtensions[pathSegment];
    }
    if (directivesInExtensions != null) {
      for (const directiveNameProp in directivesInExtensions) {
        const directiveObjs = directivesInExtensions[directiveNameProp];
        const directiveName = directiveNameProp as keyof TDirectiveAnnotationsMap;
        if (Array.isArray(directiveObjs)) {
          for (const directiveObj of directiveObjs) {
            let existingDirectiveExtensions = directiveExtensions[directiveName];
            if (!existingDirectiveExtensions) {
              existingDirectiveExtensions = [];
              directiveExtensions[directiveName] = existingDirectiveExtensions;
            }
            existingDirectiveExtensions.push(directiveObj);
          }
        } else {
          let existingDirectiveExtensions = directiveExtensions[directiveName];
          if (!existingDirectiveExtensions) {
            existingDirectiveExtensions = [];
            directiveExtensions[directiveName] = existingDirectiveExtensions;
          }
          existingDirectiveExtensions.push(directiveObjs);
        }
      }
    }
  }
  return directiveExtensions;
}
