import { dedent } from '../../__testUtils__/dedent.js';
import { kitchenSinkQuery } from '../../__testUtils__/kitchenSinkQuery.js';
import { kitchenSinkSDL } from '../../__testUtils__/kitchenSinkSDL.js';

import type { Maybe } from '../../jsutils/Maybe.js';

import { Lexer } from '../../language/lexer.js';
import { parse } from '../../language/parser.js';
import { Source } from '../../language/source.js';

import { stripIgnoredCharacters } from '../stripIgnoredCharacters.js';

function lexValue(str: string): Maybe<string> {
  const lexer = new Lexer(new Source(str));
  const value = lexer.advance().value;

  expect(lexer.advance().kind === '<EOF>').toBeTruthy();
  return value;
}

function expectStripped(docString: string) {
  return {
    toEqual(expected: string): void {
      const stripped = stripIgnoredCharacters(docString);
      expect(stripped).toEqual(expected);

      const strippedTwice = stripIgnoredCharacters(stripped);
      expect(strippedTwice).toEqual(expected);
    },
    toStayTheSame(): void {
      this.toEqual(docString);
    },
  };
}

describe('stripIgnoredCharacters', () => {
  it('strips ignored characters from GraphQL query document', () => {
    const query = dedent`
      query SomeQuery($foo: String!, $bar: String) {
        someField(foo: $foo, bar: $bar) {
          a
          b {
            c
            d
          }
        }
      }
    `;

    expect(stripIgnoredCharacters(query)).toEqual(
      'query SomeQuery($foo:String!$bar:String){someField(foo:$foo bar:$bar){a b{c d}}}'
    );
  });

  it('accepts Source object', () => {
    expect(stripIgnoredCharacters(new Source('{ a }'))).toEqual('{a}');
  });

  it('strips ignored characters from GraphQL SDL document', () => {
    const sdl = dedent`
      """
      Type description
      """
      type Foo {
        """
        Field description
        """
        bar: String
      }
    `;

    expect(stripIgnoredCharacters(sdl)).toEqual('"""Type description""" type Foo{"""Field description""" bar:String}');
  });

  it('report document with invalid token', () => {
    let caughtError;

    try {
      stripIgnoredCharacters('{ foo(arg: "\n"');
    } catch (e) {
      caughtError = e;
    }

    expect(String(caughtError)).toEqual(dedent`
      Syntax Error: Unterminated string.

      GraphQL request:1:13
      1 | { foo(arg: "
        |             ^
      2 | "
    `);
  });

  it('strips non-parsable document', () => {
    expectStripped('{ foo(arg: "str"').toEqual('{foo(arg:"str"');
  });

  it('strips documents with only ignored characters', () => {
    expectStripped('\n').toEqual('');
    expectStripped(',').toEqual('');
    expectStripped(',,').toEqual('');
    expectStripped('#comment\n, \n').toEqual('');
  });

  it('strips leading and trailing ignored tokens', () => {
    expectStripped('\n1').toEqual('1');
    expectStripped(',1').toEqual('1');
    expectStripped(',,1').toEqual('1');
    expectStripped('#comment\n, \n1').toEqual('1');

    expectStripped('1\n').toEqual('1');
    expectStripped('1,').toEqual('1');
    expectStripped('1,,').toEqual('1');
    expectStripped('1#comment\n, \n').toEqual('1');
  });

  it('strips ignored tokens between punctuator tokens', () => {
    expectStripped('[,)').toEqual('[)');
    expectStripped('[\r)').toEqual('[)');
    expectStripped('[\r\r)').toEqual('[)');
    expectStripped('[\r,)').toEqual('[)');
    expectStripped('[,\n)').toEqual('[)');
  });

  it('strips ignored tokens between punctuator and non-punctuator tokens', () => {
    expectStripped('[,1').toEqual('[1');
    expectStripped('[\r1').toEqual('[1');
    expectStripped('[\r\r1').toEqual('[1');
    expectStripped('[\r,1').toEqual('[1');
    expectStripped('[,\n1').toEqual('[1');
  });

  it('strips ignored tokens between non-punctuator and punctuator tokens', () => {
    expectStripped('1,[').toEqual('1[');
    expectStripped('1\r[').toEqual('1[');
    expectStripped('1\r\r[').toEqual('1[');
    expectStripped('1\r,[').toEqual('1[');
    expectStripped('1,\n[').toEqual('1[');
  });

  it('replace ignored tokens between non-punctuator tokens and spread with space', () => {
    expectStripped('a ...').toEqual('a ...');
    expectStripped('1 ...').toEqual('1 ...');
    expectStripped('1 ... ...').toEqual('1 ......');
  });

  it('replace ignored tokens between non-punctuator tokens with space', () => {
    expectStripped('1 2').toStayTheSame();
    expectStripped('"" ""').toStayTheSame();
    expectStripped('a b').toStayTheSame();

    expectStripped('a,1').toEqual('a 1');
    expectStripped('a,,1').toEqual('a 1');
    expectStripped('a  1').toEqual('a 1');
    expectStripped('a \t 1').toEqual('a 1');
  });

  it('does not strip ignored tokens embedded in the string', () => {
    expectStripped('" "').toStayTheSame();
    expectStripped('","').toStayTheSame();
    expectStripped('",,"').toStayTheSame();
    expectStripped('",|"').toStayTheSame();
  });

  it('does not strip ignored tokens embedded in the block string', () => {
    expectStripped('""","""').toStayTheSame();
    expectStripped('""",,"""').toStayTheSame();
    expectStripped('""",|"""').toStayTheSame();
  });

  it('strips ignored characters inside block strings', () => {
    function expectStrippedString(blockStr: string) {
      const originalValue = lexValue(blockStr);
      const strippedValue = lexValue(stripIgnoredCharacters(blockStr));

      expect(strippedValue).toEqual(originalValue);
      return expectStripped(blockStr);
    }

    expectStrippedString('""""""').toStayTheSame();
    expectStrippedString('""" """').toEqual('""""""');

    expectStrippedString('"""a"""').toStayTheSame();
    expectStrippedString('""" a"""').toEqual('""" a"""');
    expectStrippedString('""" a """').toEqual('""" a """');

    expectStrippedString('"""\n"""').toEqual('""""""');
    expectStrippedString('"""a\nb"""').toEqual('"""a\nb"""');
    expectStrippedString('"""a\rb"""').toEqual('"""a\nb"""');
    expectStrippedString('"""a\r\nb"""').toEqual('"""a\nb"""');
    expectStrippedString('"""a\r\n\nb"""').toEqual('"""a\n\nb"""');

    expectStrippedString('"""\\\n"""').toStayTheSame();
    expectStrippedString('""""\n"""').toStayTheSame();
    expectStrippedString('"""\\"""\n"""').toEqual('"""\\""""""');

    expectStrippedString('"""\na\n b"""').toStayTheSame();
    expectStrippedString('"""\n a\n b"""').toEqual('"""a\nb"""');
    expectStrippedString('"""\na\n b\nc"""').toEqual('"""a\n b\nc"""');
  });

  it('strips kitchen sink query but maintains the exact same AST', () => {
    const strippedQuery = stripIgnoredCharacters(kitchenSinkQuery);
    expect(stripIgnoredCharacters(strippedQuery)).toEqual(strippedQuery);

    const queryAST = parse(kitchenSinkQuery, {
      noLocation: true,
      experimentalClientControlledNullability: true,
    });
    const strippedAST = parse(strippedQuery, {
      noLocation: true,
      experimentalClientControlledNullability: true,
    });
    expect(strippedAST).toEqual(queryAST);
  });

  it('strips kitchen sink SDL but maintains the exact same AST', () => {
    const strippedSDL = stripIgnoredCharacters(kitchenSinkSDL);
    expect(stripIgnoredCharacters(strippedSDL)).toEqual(strippedSDL);

    const sdlAST = parse(kitchenSinkSDL, { noLocation: true });
    const strippedAST = parse(strippedSDL, { noLocation: true });
    expect(strippedAST).toEqual(sdlAST);
  });
});
