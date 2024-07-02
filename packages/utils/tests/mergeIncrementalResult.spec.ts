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

  it('should deep merge data with basic path with new format', () => {
    const executionResult = { data: { user: { name: 'John' } }, pending: [{ id: '0', path: [] }] };
    const incrementalResult = { incremental: [{ id: '0', data: { user: { age: 42 } } }] };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult.data).toEqual({ user: { age: 42, name: 'John' } });
  });

  it('should merge data at path', () => {
    const executionResult = { data: { user: { name: 'John' } } };
    const incrementalResult = { path: ['user'], data: { age: 42 } };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult).toEqual({ data: { user: { age: 42, name: 'John' } } });
  });

  it('should merge data at path with new format', () => {
    const executionResult = {
      data: { user: { name: 'John' } },
      pending: [{ id: '0', path: ['user'] }],
    };
    const incrementalResult = { incremental: [{ id: '0', data: { age: 42 } }] };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult.data).toEqual({ user: { age: 42, name: 'John' } });
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

  it('should push items at path with new format', () => {
    const executionResult = {
      data: {
        user: { name: 'John', comments: ['comment 1', 'comment 2'] },
      },
      pending: [{ id: '0', path: ['user', 'comments'] }],
    };
    const incrementalResult = {
      incremental: [{ id: '0', items: ['comment 3', 'comment 4'] }],
    };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult.data).toEqual({
      user: {
        name: 'John',
        comments: ['comment 1', 'comment 2', 'comment 3', 'comment 4'],
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

  it('should add errors with new format', () => {
    const executionResult = { data: { user: { name: 'John' } }, pending: [{ id: '0', path: [] }] };
    const incrementalResult = {
      incremental: [
        { id: '0', errors: [new GraphQLError('error 1'), new GraphQLError('error 2')] },
      ],
    };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult).toEqual({
      data: { user: { name: 'John' } },
      errors: [new GraphQLError('error 1'), new GraphQLError('error 2')],
      pending: [{ id: '0', path: [] }],
    });
  });

  it('should add completion errors with new format', () => {
    const executionResult = { data: { user: { name: 'John' } }, pending: [{ id: '0', path: [] }] };
    const incrementalResult = {
      completed: [{ id: '0', errors: [new GraphQLError('error 1'), new GraphQLError('error 2')] }],
    };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult).toEqual({
      data: { user: { name: 'John' } },
      errors: [new GraphQLError('error 1'), new GraphQLError('error 2')],
      pending: [{ id: '0', path: [] }],
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

  it('should keep errors with new format', () => {
    const executionResult = {
      errors: [new GraphQLError('error 1')],
      pending: [{ id: '0', path: [] }],
    };
    const incrementalResult = {
      incremental: [{ id: '0', data: { user: { name: 'John' } }, path: [] }],
    };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult).toEqual({
      data: { user: { name: 'John' } },
      errors: [new GraphQLError('error 1')],
      pending: [{ id: '0', path: [] }],
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

  it('should merge errors with new format', () => {
    const executionResult = {
      errors: [new GraphQLError('error 1')],
      pending: [{ id: '0', path: [] }],
    };

    const incrementalResult = {
      incremental: [
        { id: '0', errors: [new GraphQLError('error 2'), new GraphQLError('error 3')] },
      ],
    };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult).toEqual({
      errors: [
        new GraphQLError('error 1'),
        new GraphQLError('error 2'),
        new GraphQLError('error 3'),
      ],
      pending: [{ id: '0', path: [] }],
    });
  });

  it('should merge completion errors with new format', () => {
    const executionResult = {
      errors: [new GraphQLError('error 1')],
      pending: [{ id: '0', path: [] }],
    };

    const incrementalResult = {
      completed: [{ id: '0', errors: [new GraphQLError('error 2'), new GraphQLError('error 3')] }],
    };

    mergeIncrementalResult({ incrementalResult, executionResult });

    expect(executionResult).toEqual({
      errors: [
        new GraphQLError('error 1'),
        new GraphQLError('error 2'),
        new GraphQLError('error 3'),
      ],
      pending: [{ id: '0', path: [] }],
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
});
