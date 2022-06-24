import {
  DocumentNode,
  Kind,
  ASTNode,
  parse,
  Source as GraphQLSource,
  visit,
  isTypeSystemDefinitionNode,
  StringValueNode,
  print,
} from 'graphql';
import { dedentBlockStringValue, getLeadingCommentBlock } from './comments.js';
import { GraphQLParseOptions } from './Interfaces.js';

export function parseGraphQLSDL(location: string | undefined, rawSDL: string, options: GraphQLParseOptions = {}) {
  let document: DocumentNode;

  try {
    if (options.commentDescriptions && rawSDL.includes('#')) {
      document = transformCommentsToDescriptions(rawSDL, options);

      // If noLocation=true, we need to make sure to print and parse it again, to remove locations,
      // since `transformCommentsToDescriptions` must have locations set in order to transform the comments
      // into descriptions.
      if (options.noLocation) {
        document = parse(print(document), options);
      }
    } else {
      document = parse(new GraphQLSource(rawSDL, location), options);
    }
  } catch (e: any) {
    if (e.message.includes('EOF') && rawSDL.replace(/(\#[^*]*)/g, '').trim() === '') {
      document = {
        kind: Kind.DOCUMENT,
        definitions: [],
      };
    } else {
      throw e;
    }
  }

  return {
    location,
    document,
  };
}

export function transformCommentsToDescriptions(sourceSdl: string, options: GraphQLParseOptions = {}): DocumentNode {
  const parsedDoc = parse(sourceSdl, {
    ...options,
    noLocation: false,
  });
  const modifiedDoc = visit(parsedDoc, {
    leave: (node: ASTNode) => {
      if (isDescribable(node)) {
        const rawValue = getLeadingCommentBlock(node);

        if (rawValue !== undefined) {
          const commentsBlock = dedentBlockStringValue('\n' + rawValue);
          const isBlock = commentsBlock.includes('\n');

          if (!node.description) {
            return {
              ...node,
              description: {
                kind: Kind.STRING,
                value: commentsBlock,
                block: isBlock,
              },
            };
          } else {
            return {
              ...node,
              description: {
                ...node.description,
                value: node.description.value + '\n' + commentsBlock,
                block: true,
              },
            };
          }
        }
      }
    },
  });

  return modifiedDoc;
}

type DiscriminateUnion<T, U> = T extends U ? T : never;
type DescribableASTNodes = DiscriminateUnion<
  ASTNode,
  {
    description?: StringValueNode;
  }
>;

export function isDescribable(node: ASTNode): node is DescribableASTNodes {
  return (
    isTypeSystemDefinitionNode(node) ||
    node.kind === Kind.FIELD_DEFINITION ||
    node.kind === Kind.INPUT_VALUE_DEFINITION ||
    node.kind === Kind.ENUM_VALUE_DEFINITION
  );
}
