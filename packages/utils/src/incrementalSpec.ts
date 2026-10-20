export type IncrementalSpec = 'v0.1' | 'v0.2';

export const MULTIPART_MIXED = 'multipart/mixed';
export const DEFAULT_MULTIPART_BOUNDARY = '-';

/**
 * HTTP identifier for an incremental delivery payload format.
 *
 * Servers and HTTP executors map Accept / Content-Type parameters to `id`.
 * Payload JSON stays in `@graphql-tools/executor`. A new spec is a new row
 * here plus an executor publisher; unknown values for a registered parameter
 * name should be treated as unsupported (HTTP 406).
 */
export interface IncrementalDeliverySpec {
  id: IncrementalSpec;
  parameter: string;
  value: string;
  default?: boolean;
}

export const INCREMENTAL_DELIVERY_SPECS: readonly IncrementalDeliverySpec[] = [
  { id: 'v0.1', parameter: 'deferSpec', value: '20220824', default: true },
  { id: 'v0.2', parameter: 'incrementalSpec', value: 'v0.2' },
];

export function getDefaultIncrementalDeliverySpec(
  specs: readonly IncrementalDeliverySpec[] = INCREMENTAL_DELIVERY_SPECS,
): IncrementalDeliverySpec {
  return specs.find(spec => spec.default) ?? specs[0]!;
}

export function getIncrementalSpecParameterNames(
  specs: readonly IncrementalDeliverySpec[] = INCREMENTAL_DELIVERY_SPECS,
): Set<string> {
  return new Set(specs.map(spec => spec.parameter.toLowerCase()));
}

export function getMultipartContentType(
  spec?: IncrementalDeliverySpec,
  options: { echoSpec?: boolean; boundary?: string } = {},
): string {
  const boundary = options.boundary ?? DEFAULT_MULTIPART_BOUNDARY;
  const base = `${MULTIPART_MIXED}; boundary="${boundary}"`;
  if (spec == null || options.echoSpec !== true) {
    return base;
  }
  return `${base}; ${spec.parameter}=${spec.value}`;
}

export const DEFAULT_MULTIPART_CONTENT_TYPE = getMultipartContentType();

/**
 * Resolve registered spec parameters on a multipart media type.
 *
 * Unknown parameter names are ignored. A registered parameter with an
 * unregistered value is `'unsupported'`.
 */
export function lookupIncrementalDeliverySpec(
  params: Record<string, string>,
  specs: readonly IncrementalDeliverySpec[] = INCREMENTAL_DELIVERY_SPECS,
): IncrementalDeliverySpec | 'unsupported' | undefined {
  let matched: IncrementalDeliverySpec | undefined;
  for (const [name, value] of Object.entries(params)) {
    const named = specs.filter(spec => spec.parameter.toLowerCase() === name);
    if (named.length === 0) {
      continue;
    }
    const spec = named.find(candidate => candidate.value.toLowerCase() === value);
    if (spec == null) {
      return 'unsupported';
    }
    matched = spec;
  }
  return matched;
}
