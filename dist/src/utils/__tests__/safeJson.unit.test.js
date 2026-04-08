"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const safeJson_1 = require("../safeJson");
describe('safeJsonParse', () => {
    it('parses valid JSON', () => {
        expect((0, safeJson_1.safeJsonParse)('{"a":1}')).toEqual({ a: 1 });
    });
    it('returns fallback for invalid JSON', () => {
        expect((0, safeJson_1.safeJsonParse)('not-json', { b: 2 })).toEqual({ b: 2 });
    });
});
describe('safeJsonStringify', () => {
    it('stringifies valid object', () => {
        expect((0, safeJson_1.safeJsonStringify)({ a: 1 })).toBe('{"a":1}');
    });
    it('returns fallback for circular refs', () => {
        const obj = {};
        obj.self = obj;
        expect((0, safeJson_1.safeJsonStringify)(obj, 'null')).toBe('null');
    });
});
