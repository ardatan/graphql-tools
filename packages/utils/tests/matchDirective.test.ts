import { matchDirective } from '../src/matchDirective';

describe('matchDirective', () => {
  test('matches a directive node based on flexible criteria', () => {
    const dir = {
      kind: 'Directive',
      name: { kind: 'Name', value: 'deprecated' },
      arguments: [{
        kind: 'Argument',
        name: { kind: 'Name', value: 'reason' },
        value: {
          kind: 'StringValue',
          value: 'reason',
          block: false,
        }
      }, {
        kind: 'Argument',
        name: { kind: 'Name', value: 'also' },
        value: {
          kind: 'StringValue',
          value: 'also',
          block: false,
        }
      }]
    };

    expect(matchDirective(dir, 'notthis')).toBe(false);
    expect(matchDirective(dir, 'deprecated')).toBe(true);
    expect(matchDirective(dir, 'deprecated', { reason: 'reason' })).toBe(true);
    expect(matchDirective(dir, 'deprecated', { reason: 'reason', also: 'also' })).toBe(true);
    expect(matchDirective(dir, 'deprecated', { reason: 'reason', and: 'and' })).toBe(false);
    expect(matchDirective(dir, 'deprecated', { this: 'this' })).toBe(false);
  });
});
