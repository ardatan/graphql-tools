import {
  DEFAULT_MULTIPART_CONTENT_TYPE,
  getDefaultIncrementalDeliverySpec,
  getIncrementalSpecParameterNames,
  getMultipartContentType,
  INCREMENTAL_DELIVERY_SPECS,
  lookupIncrementalDeliverySpec,
  type IncrementalDeliverySpec,
} from '../src/incrementalSpec';

const v01 = INCREMENTAL_DELIVERY_SPECS.find(spec => spec.id === 'v0.1')!;
const v02 = INCREMENTAL_DELIVERY_SPECS.find(spec => spec.id === 'v0.2')!;

describe('incremental delivery spec table', () => {
  it('defaults to v0.1 / deferSpec=20220824', () => {
    expect(getDefaultIncrementalDeliverySpec()).toEqual(v01);
    expect(getIncrementalSpecParameterNames()).toEqual(new Set(['deferspec', 'incrementalspec']));
  });

  it('looks up registered Accept parameters', () => {
    expect(lookupIncrementalDeliverySpec({ incrementalspec: 'v0.2' })).toEqual(v02);
    expect(lookupIncrementalDeliverySpec({ deferspec: '20220824' })).toEqual(v01);
    expect(lookupIncrementalDeliverySpec({})).toBeUndefined();
  });

  it('rejects unknown values for registered parameter names', () => {
    expect(lookupIncrementalDeliverySpec({ incrementalspec: 'v0.3' })).toBe('unsupported');
    expect(lookupIncrementalDeliverySpec({ deferspec: '2019' })).toBe('unsupported');
  });

  it('matches registered parameter names and values case-insensitively', () => {
    expect(lookupIncrementalDeliverySpec({ deferSpec: '20220824' })).toEqual(v01);
    expect(lookupIncrementalDeliverySpec({ IncrementalSpec: 'V0.2' })).toEqual(v02);
    expect(lookupIncrementalDeliverySpec({ incrementalSpec: 'v0.3' })).toBe('unsupported');
  });

  it('ignores unregistered parameter names', () => {
    expect(lookupIncrementalDeliverySpec({ boundary: '-' })).toBeUndefined();
  });

  it('builds multipart Content-Type from the table', () => {
    expect(getMultipartContentType()).toBe(DEFAULT_MULTIPART_CONTENT_TYPE);
    expect(getMultipartContentType(v01, { echoSpec: false })).toBe('multipart/mixed; boundary="-"');
    expect(getMultipartContentType(v01, { echoSpec: true })).toBe(
      'multipart/mixed; boundary="-"; deferSpec=20220824',
    );
    expect(getMultipartContentType(v02, { echoSpec: true })).toBe(
      'multipart/mixed; boundary="-"; incrementalSpec=v0.2',
    );
  });

  it('picks up extra specs from the table without lookup changes', () => {
    const specs: IncrementalDeliverySpec[] = [
      ...INCREMENTAL_DELIVERY_SPECS,
      { id: 'v0.2', parameter: 'legacyInc', value: '1' },
    ];
    expect(lookupIncrementalDeliverySpec({ legacyinc: '1' }, specs)).toEqual(specs[2]);
    expect(getIncrementalSpecParameterNames(specs)).toEqual(
      new Set(['deferspec', 'incrementalspec', 'legacyinc']),
    );
  });
});
