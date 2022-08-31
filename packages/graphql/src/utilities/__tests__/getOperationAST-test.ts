import { parse } from '../../language/parser.js';

import { getOperationAST } from '../getOperationAST.js';

describe('getOperationAST', () => {
  it('Gets an operation from a simple document', () => {
    const doc = parse('{ field }');
    expect(getOperationAST(doc)).toEqual(doc.definitions[0]);
  });

  it('Gets an operation from a document with named op (mutation)', () => {
    const doc = parse('mutation Test { field }');
    expect(getOperationAST(doc)).toEqual(doc.definitions[0]);
  });

  it('Gets an operation from a document with named op (subscription)', () => {
    const doc = parse('subscription Test { field }');
    expect(getOperationAST(doc)).toEqual(doc.definitions[0]);
  });

  it('Does not get missing operation', () => {
    const doc = parse('type Foo { field: String }');
    expect(getOperationAST(doc)).toBeNull();
  });

  it('Does not get ambiguous unnamed operation', () => {
    const doc = parse(`
      { field }
      mutation Test { field }
      subscription TestSub { field }
    `);
    expect(getOperationAST(doc)).toBeNull();
  });

  it('Does not get ambiguous named operation', () => {
    const doc = parse(`
      query TestQ { field }
      mutation TestM { field }
      subscription TestS { field }
    `);
    expect(getOperationAST(doc)).toBeNull();
  });

  it('Does not get misnamed operation', () => {
    const doc = parse(`
      { field }

      query TestQ { field }
      mutation TestM { field }
      subscription TestS { field }
    `);
    expect(getOperationAST(doc, 'Unknown')).toBeNull();
  });

  it('Gets named operation', () => {
    const doc = parse(`
      query TestQ { field }
      mutation TestM { field }
      subscription TestS { field }
    `);
    expect(getOperationAST(doc, 'TestQ')).toEqual(doc.definitions[0]);
    expect(getOperationAST(doc, 'TestM')).toEqual(doc.definitions[1]);
    expect(getOperationAST(doc, 'TestS')).toEqual(doc.definitions[2]);
  });
});
