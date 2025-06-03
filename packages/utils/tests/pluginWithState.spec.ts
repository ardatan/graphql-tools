import { getMostSpecificState, withState } from '../src/pluginWithState';

describe('pluginWithState', () => {
  const plugin = withState<any>(() => ({ hook: (...args) => args }));

  it('should work with an empty plugin', () => {
    const plugin = withState(() => ({}));
    expect(plugin).toEqual({});
  });

  it('should allow to have hooks without parameters', () => {
    expect(plugin.hook()).toEqual([]);
  });

  it('should allow to have attribute that are not function', () => {
    const plugin = withState<any>(() => ({ test: 'test' }));

    expect(plugin).toEqual({ test: 'test' });
  });

  it('should keep parameters when there is no state to add', () => {
    const objectPayload = {};
    expect(plugin.hook(objectPayload)[0]).toBe(objectPayload);

    const arrayPayload = [];
    expect(plugin.hook(arrayPayload)[0]).toBe(arrayPayload);

    expect(plugin.hook('test')[0]).toBe('test');
    expect(plugin.hook(1)[0]).toBe(1);
    expect(plugin.hook(true)[0]).toBe(true);
    expect(plugin.hook(false)[0]).toBe(false);
  });

  it('should add request state', () => {
    expect(plugin.hook({ request: {} })).toMatchObject([{ state: { forRequest: {} } }]);
  });

  it('should add operation state', () => {
    expect(plugin.hook({ context: {} })).toMatchObject([{ state: { forOperation: {} } }]);
  });

  it('should add subgraph execution state', () => {
    expect(plugin.hook({ executionRequest: {} })).toMatchObject([
      { state: { forSubgraphExecution: {} } },
    ]);
  });

  it('should combine all states', () => {
    expect(plugin.hook({ context: {}, request: {} })).toMatchObject([
      { state: { forOperation: {}, forRequest: {} } },
    ]);
    expect(plugin.hook({ context: {}, executionRequest: {} })).toMatchObject([
      { state: { forOperation: {}, forSubgraphExecution: {} } },
    ]);

    expect(plugin.hook({ executionRequest: {}, request: {} })).toMatchObject([
      { state: { forSubgraphExecution: {}, forRequest: {} } },
    ]);

    expect(plugin.hook({ executionRequest: {}, request: {}, context: {} })).toMatchObject([
      { state: { forSubgraphExecution: {}, forRequest: {}, forOperation: {} } },
    ]);
  });

  it('should have a stable state', () => {
    const refs = { request: {}, context: {}, executionRequest: {} };
    const { forRequest, forOperation, forSubgraphExecution } = plugin.hook(refs);

    expect(plugin.hook(refs)[0].forRequest).toBe(forRequest);
    expect(plugin.hook(refs)[0].forOperation).toBe(forOperation);
    expect(plugin.hook(refs)[0].forSubgraphExecution).toBe(forSubgraphExecution);

    expect(plugin.hook({ request: refs.request })[0].forRequest).toBe(forRequest);
    expect(plugin.hook({ context: refs.context })[0].forOperation).toBe(forOperation);
    expect(plugin.hook({ executionRequest: refs.executionRequest })[0].forSubgraphExecution).toBe(
      forSubgraphExecution,
    );
  });

  describe('instruments', () => {
    const plugin = withState(() => ({ instrumentation: { hook: (...args: any[]): any => args } }));

    it('should add request state', () => {
      expect(plugin.instrumentation.hook({ request: {} })).toMatchObject([
        { state: { forRequest: {} } },
      ]);
    });

    it('should add operation state', () => {
      expect(plugin.instrumentation.hook({ context: {} })).toMatchObject([
        { state: { forOperation: {} } },
      ]);
    });

    it('should add subgraph execution state', () => {
      expect(plugin.instrumentation.hook({ executionRequest: {} })).toMatchObject([
        { state: { forSubgraphExecution: {} } },
      ]);
    });

    it('should combine all states', () => {
      expect(plugin.instrumentation.hook({ context: {}, request: {} })).toMatchObject([
        { state: { forOperation: {}, forRequest: {} } },
      ]);
      expect(plugin.instrumentation.hook({ context: {}, executionRequest: {} })).toMatchObject([
        { state: { forOperation: {}, forSubgraphExecution: {} } },
      ]);

      expect(plugin.instrumentation.hook({ executionRequest: {}, request: {} })).toMatchObject([
        { state: { forSubgraphExecution: {}, forRequest: {} } },
      ]);

      expect(
        plugin.instrumentation.hook({ executionRequest: {}, request: {}, context: {} }),
      ).toMatchObject([{ state: { forSubgraphExecution: {}, forRequest: {}, forOperation: {} } }]);
    });

    it('should have a stable state', () => {
      const refs = { request: {}, context: {}, executionRequest: {} };
      const { forRequest, forOperation, forSubgraphExecution } = plugin.instrumentation.hook(refs);

      expect(plugin.instrumentation.hook(refs)[0].forRequest).toBe(forRequest);
      expect(plugin.instrumentation.hook(refs)[0].forOperation).toBe(forOperation);
      expect(plugin.instrumentation.hook(refs)[0].forSubgraphExecution).toBe(forSubgraphExecution);

      expect(plugin.instrumentation.hook({ request: refs.request })[0].forRequest).toBe(forRequest);
      expect(plugin.instrumentation.hook({ context: refs.context })[0].forOperation).toBe(
        forOperation,
      );
      expect(
        plugin.instrumentation.hook({ executionRequest: refs.executionRequest })[0]
          .forSubgraphExecution,
      ).toBe(forSubgraphExecution);
    });
  });

  describe('getState', () => {
    let getState;
    withState(_getState => {
      getState = _getState;
      return {};
    });

    it('should add request state', () => {
      expect(getState({ request: {} })).toMatchObject({ forRequest: {} });
    });

    it('should add operation state', () => {
      expect(getState({ context: {} })).toMatchObject({ forOperation: {} });
    });

    it('should add subgraph execution state', () => {
      expect(getState({ executionRequest: {} })).toMatchObject({ forSubgraphExecution: {} });
    });

    it('should combine all states', () => {
      expect(getState({ context: {}, request: {} })).toMatchObject({
        forOperation: {},
        forRequest: {},
      });
      expect(getState({ context: {}, executionRequest: {} })).toMatchObject({
        forOperation: {},
        forSubgraphExecution: {},
      });

      expect(getState({ executionRequest: {}, request: {} })).toMatchObject({
        forSubgraphExecution: {},
        forRequest: {},
      });

      expect(getState({ executionRequest: {}, request: {}, context: {} })).toMatchObject({
        forSubgraphExecution: {},
        forRequest: {},
        forOperation: {},
      });
    });

    it('should have a stable state', () => {
      const refs = { request: {}, context: {}, executionRequest: {} };
      const { forRequest, forOperation, forSubgraphExecution } = getState(refs);

      expect(getState(refs).forRequest).toBe(forRequest);
      expect(getState(refs).forOperation).toBe(forOperation);
      expect(getState(refs).forSubgraphExecution).toBe(forSubgraphExecution);

      expect(getState({ request: refs.request }).forRequest).toBe(forRequest);
      expect(getState({ context: refs.context }).forOperation).toBe(forOperation);
      expect(getState({ executionRequest: refs.executionRequest }).forSubgraphExecution).toBe(
        forSubgraphExecution,
      );
    });
  });

  describe('getMostSpecificState', () => {
    it('should return the most specific state', () => {
      const forRequest = {};
      const forOperation = {};
      const forSubgraphExecution = {};

      expect(getMostSpecificState({ forRequest })).toBe(forRequest);
      expect(getMostSpecificState({ forOperation })).toBe(forOperation);
      expect(getMostSpecificState({ forSubgraphExecution })).toBe(forSubgraphExecution);

      expect(getMostSpecificState({ forRequest, forOperation })).toBe(forOperation);
      expect(getMostSpecificState({ forRequest, forSubgraphExecution })).toBe(forSubgraphExecution);

      expect(getMostSpecificState({ forOperation, forSubgraphExecution })).toBe(
        forSubgraphExecution,
      );

      expect(getMostSpecificState({ forOperation, forRequest, forSubgraphExecution })).toBe(
        forSubgraphExecution,
      );
    });
  });
});
