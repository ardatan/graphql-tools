import { inspect } from '../src/inspect.js';

describe('inspect', () => {
  it('bounds recursive toJSON formatting', () => {
    type Nested = { toJSON: () => Nested | string };
    const nested: Nested = {
      toJSON() {
        return nested;
      },
    };
    // Self-returning toJSON is treated as identity and falls through.
    expect(() => inspect(nested)).not.toThrow();

    let depth = 0;
    const chain: Nested = {
      toJSON() {
        depth += 1;
        if (depth > 20) {
          return 'too-deep';
        }
        return {
          toJSON() {
            return chain.toJSON();
          },
        };
      },
    };

    depth = 0;
    const printed = inspect(chain);
    // Each recursive toJSON hop decrements the depth budget (default 3).
    expect(depth).toBeLessThanOrEqual(3);
    expect(typeof printed).toBe('string');
    expect(printed).not.toBe('too-deep');
  });

  it('still formats a single toJSON hop', () => {
    expect(inspect({ toJSON: () => ({ ok: true }) })).toContain('ok');
  });
});
