import {
  ParseOptions,
  DocumentNode,
  Kind,
  TokenKind,
  ASTNode,
  parse,
  Source as GraphQLSource,
  visit,
  isTypeSystemDefinitionNode,
  StringValueNode,
  print,
} from 'graphql';
import { dedentBlockStringValue } from 'graphql/language/blockString';

export interface ExtendedParseOptions extends ParseOptions {
  /**
   * Set to `true` in order to convert all GraphQL comments (marked with # sign) to descriptions (""")
   * GraphQL has built-in support for transforming descriptions to comments (with `print`), but not while
   * parsing. Turning the flag on will support the other way as well (`parse`)
   */
  commentDescriptions?: boolean;
}

export function parseGraphQLSDL(location: string, rawSDL: string, options: ExtendedParseOptions = {}) {
  let document: DocumentNode;
  const sdl: string = rawSDL;
  let sdlModified = false;

  try {
    if (options.commentDescriptions && sdl.includes('#')) {
      sdlModified = true;
      document = transformCommentsToDescriptions(rawSDL, options);

      // If noLocation=true, we need to make sure to print and parse it again, to remove locations,
      // since `transformCommentsToDescriptions` must have locations set in order to transform the comments
      // into descriptions.
      if (options.noLocation) {
        document = parse(print(document), options);
      }
    } else {
      document = parse(new GraphQLSource(sdl, location), options);
    }
  } catch (e) {
    if (e.message.includes('EOF')) {
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
    rawSDL: sdlModified ? print(document) : sdl,
  };
}

export function getLeadingCommentBlock(node: ASTNode): void | string {
  const loc = node.loc;

  if (!loc) {
    return;
  }

  const comments = [];
  let token = loc.startToken.prev;

  while (
    token != null &&
    token.kind === TokenKind.COMMENT &&
    token.next &&
    token.prev &&
    token.line + 1 === token.next.line &&
    token.line !== token.prev.line
  ) {
    const value = String(token.value);
    comments.push(value);
    token = token.prev;
  }

  return comments.length > 0 ? comments.reverse().join('\n') : undefined;
}

export function transformCommentsToDescriptions(
  sourceSdl: string,
  options: ExtendedParseOptions = {}
): DocumentNode | null {
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
