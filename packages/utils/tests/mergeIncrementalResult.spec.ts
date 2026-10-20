import { GraphQLError } from 'graphql';
import { mergeIncrementalResult } from '../src/mergeIncrementalResult';

describe('mergeIncrementalResult', () => {
  it('should merge data without path', () => {
    const executionResult = { data: { user: { name: 'John' } } };
    const incrementalResult = { data: { user: { age: 42 } } };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult).toEqual({ data: { user: { age: 42, name: 'John' } } });
  });

  it('should deep merge data with basic path', () => {
    const executionResult = { data: { user: { name: 'John' } } };
    const incrementalResult = { path: [], data: { user: { age: 42 } } };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult).toEqual({ data: { user: { age: 42, name: 'John' } } });
  });

  it('should merge data at path', () => {
    const executionResult = { data: { user: { name: 'John' } } };
    const incrementalResult = { path: ['user'], data: { age: 42 } };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult).toEqual({ data: { user: { age: 42, name: 'John' } } });
  });

  it('should push items', () => {
    const executionResult = { data: { user: { name: 'John' } } };
    const incrementalResult = {
      path: ['user', 'comments', 0],
      items: ['comment 1', 'comment 2'],
    };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult).toEqual({
      data: {
        user: {
          name: 'John',
          comments: ['comment 1', 'comment 2'],
        },
      },
    });
  });

  it('should push items at path', () => {
    const executionResult = {
      data: { user: { name: 'John', comments: ['comment 1', 'comment 2'] } },
    };
    const incrementalResult = {
      path: ['user', 'comments', 2],
      items: ['comment 3', 'comment 4'],
    };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult).toEqual({
      data: {
        user: {
          name: 'John',
          comments: ['comment 1', 'comment 2', 'comment 3', 'comment 4'],
        },
      },
    });
  });

  it('should merge items at path', () => {
    const executionResult = {
      data: {
        user: {
          name: 'John',
          comments: [{ id: 1 }, { id: 2 }],
        },
      },
    };

    const incrementalResult = {
      path: ['user', 'comments', 0],
      items: [{ text: 'comment 1' }, { text: 'comment 2' }],
    };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult).toEqual({
      data: {
        user: {
          name: 'John',
          comments: [
            { id: 1, text: 'comment 1' },
            { id: 2, text: 'comment 2' },
          ],
        },
      },
    });
  });

  it('should add errors', () => {
    const executionResult = { data: { user: { name: 'John' } } };
    const incrementalResult = {
      errors: [new GraphQLError('error 1'), new GraphQLError('error 2')],
    };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult).toEqual({
      data: { user: { name: 'John' } },
      errors: [new GraphQLError('error 1'), new GraphQLError('error 2')],
    });
  });

  it('should keep errors', () => {
    const executionResult = { errors: [new GraphQLError('error 1')] };
    const incrementalResult = { data: { user: { name: 'John' } }, path: [] };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult).toEqual({
      data: { user: { name: 'John' } },
      errors: [new GraphQLError('error 1')],
    });
  });

  it('should merge errors', () => {
    const executionResult = { errors: [new GraphQLError('error 1')] };

    const incrementalResult = {
      errors: [new GraphQLError('error 2'), new GraphQLError('error 3')],
    };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult).toEqual({
      errors: [
        new GraphQLError('error 1'),
        new GraphQLError('error 2'),
        new GraphQLError('error 3'),
      ],
    });
  });

  it('should keep extensions', () => {
    const exeuctionResult = { data: { user: { name: 'John' } }, extensions: { foo: 'bar' } };
    const incrementalResult = { data: { user: { age: 42 } }, path: [] };

    mergeIncrementalResult({ incrementalResult, executionResult: exeuctionResult });

    expect(exeuctionResult).toEqual({
      data: { user: { age: 42, name: 'John' } },
      extensions: { foo: 'bar' },
    });
  });

  it('should add extensions', () => {
    const exeuctionResult = { data: { user: { name: 'John' } } };
    const incrementalResult = {
      data: { user: { age: 42 } },
      path: [],
      extensions: { ext1: 'ext1' },
    };

    mergeIncrementalResult({ incrementalResult, executionResult: exeuctionResult });

    expect(exeuctionResult).toEqual({
      data: { user: { age: 42, name: 'John' } },
      extensions: { ext1: 'ext1' },
    });
  });

  it('should merge extensions', () => {
    const exeuctionResult = { data: { user: { name: 'John' } }, extensions: { ext1: { a: 'a' } } };
    const incrementalResult = {
      data: { user: { age: 42 } },
      path: [],
      extensions: { ext1: { b: 'b' }, ext2: 'ext2' },
    };

    mergeIncrementalResult({ incrementalResult, executionResult: exeuctionResult });

    expect(exeuctionResult).toEqual({
      data: { user: { age: 42, name: 'John' } },
      extensions: { ext1: { a: 'a', b: 'b' }, ext2: 'ext2' },
    });
  });

  it('should let incremental result override previous extensions', () => {
    const executionResult = { extensions: { ext1: { a: 'a' } } };
    const incrementalResult = { extensions: { ext1: { a: 'b' } } };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult).toEqual({
      extensions: { ext1: { a: 'b' } },
    });
  });

  it('rejects array path segments that coerce to __proto__', () => {
    delete (Object.prototype as any).polluted;
    const executionResult = { data: {} };
    const incrementalResult = JSON.parse('{"path":[["__proto__"],"polluted"],"data":"yes"}');

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(({} as any).polluted).toBeUndefined();
    expect(executionResult).toEqual({ data: {} });
    delete (Object.prototype as any).polluted;
  });

  it('rejects plain-string __proto__ path segments', () => {
    delete (Object.prototype as any).polluted;
    const executionResult = { data: {} };
    const incrementalResult = {
      path: ['__proto__', 'polluted'],
      data: 'yes',
    };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(({} as any).polluted).toBeUndefined();
    expect(executionResult).toEqual({ data: {} });
    delete (Object.prototype as any).polluted;
  });

  it('rejects a plain-string __proto__ final segment', () => {
    delete (Object.prototype as any).polluted;
    const executionResult = { data: {} };
    const incrementalResult = {
      path: ['__proto__'],
      data: { polluted: 'yes' },
    };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(({} as any).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(executionResult)).toBe(Object.prototype);
    expect(executionResult).toEqual({ data: {} });
    delete (Object.prototype as any).polluted;
  });

  it('rejects object path segments that coerce via toString', () => {
    delete (Object.prototype as any).polluted;
    const executionResult = { data: {} };
    const incrementalResult = {
      path: [{ toString: () => '__proto__' }, 'polluted'],
      data: 'yes',
    };

    mergeIncrementalResult({
      incrementalResult: incrementalResult as any,
      executionResult,
    });

    expect(({} as any).polluted).toBeUndefined();
    expect(executionResult).toEqual({ data: {} });
    delete (Object.prototype as any).polluted;
  });

  it('rejects array path segments that coerce to __proto__ via items', () => {
    delete (Object.prototype as any).polluted;
    const executionResult = { data: {} };
    const incrementalResult = JSON.parse('{"path":[["__proto__"],"polluted",0],"items":["yes"]}');

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(({} as any).polluted).toBeUndefined();
    expect(executionResult).toEqual({ data: {} });
    delete (Object.prototype as any).polluted;
  });

  it('does not create parent objects before rejecting a later unsafe segment', () => {
    delete (Object.prototype as any).polluted;
    const executionResult = { data: {} };
    const incrementalResult = JSON.parse(
      '{"path":["viewer",["__proto__"],"polluted"],"data":"yes"}',
    );

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(({} as any).polluted).toBeUndefined();
    expect(executionResult).toEqual({ data: {} });
    delete (Object.prototype as any).polluted;
  });

  it('does not write later items after rejecting an unsafe items path', () => {
    delete (Object.prototype as any).polluted;
    const executionResult = { data: {} };
    const incrementalResult = JSON.parse('{"path":[["__proto__"]],"items":["yes","no"]}');

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(({} as any).polluted).toBeUndefined();
    expect(executionResult).toEqual({ data: {} });
    expect((executionResult.data as any).NaN).toBeUndefined();
    delete (Object.prototype as any).polluted;
  });

  it('merges v0.2 deferred data by pending id', () => {
    const executionResult = {
      data: { hero: { id: '1' } },
    };
    mergeIncrementalResult({
      incrementalResult: { pending: [{ id: '0', path: ['hero'] }] },
      executionResult,
    });
    mergeIncrementalResult({
      incrementalResult: {
        incremental: [{ id: '0', data: { name: 'Luke' } }],
        completed: [{ id: '0' }],
        hasNext: false,
      },
      executionResult,
    });

    expect(executionResult.data).toEqual({ hero: { id: '1', name: 'Luke' } });
  });

  it('appends v0.2 streamed items by pending id', () => {
    const executionResult = {
      data: { scalarList: ['apple'] },
    };
    mergeIncrementalResult({
      incrementalResult: { pending: [{ id: '0', path: ['scalarList'] }] },
      executionResult,
    });
    mergeIncrementalResult({
      incrementalResult: {
        incremental: [{ id: '0', items: ['banana', 'coconut'] }],
        completed: [{ id: '0' }],
        hasNext: false,
      },
      executionResult,
    });

    expect(executionResult.data).toEqual({
      scalarList: ['apple', 'banana', 'coconut'],
    });
  });

  it('merges v0.2 deferred data at subPath', () => {
    const executionResult = {
      data: { f2: { a: 'a' } },
    };
    mergeIncrementalResult({
      incrementalResult: { pending: [{ id: '0', path: [] }] },
      executionResult,
    });
    mergeIncrementalResult({
      incrementalResult: {
        incremental: [{ id: '0', subPath: ['f2'], data: { b: 'b' } }],
        completed: [{ id: '0' }],
        hasNext: false,
      },
      executionResult,
    });

    expect(executionResult.data).toEqual({ f2: { a: 'a', b: 'b' } });
  });
});
