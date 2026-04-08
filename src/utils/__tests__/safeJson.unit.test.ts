import { safeJsonParse, safeJsonStringify } from '../safeJson';

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
  });
  it('returns fallback for invalid JSON', () => {
    expect(safeJsonParse('not-json', { b: 2 })).toEqual({ b: 2 });
  });
});

describe('safeJsonStringify', () => {
  it('stringifies valid object', () => {
    expect(safeJsonStringify({ a: 1 })).toBe('{"a":1}');
  });
  it('returns fallback for circular refs', () => {
    const obj: any = {};
    obj.self = obj;
    expect(safeJsonStringify(obj, 'null')).toBe('null');
  });
});
