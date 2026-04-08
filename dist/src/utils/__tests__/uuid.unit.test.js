"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("../uuid");
describe('isValidUuid', () => {
    it('validates correct UUIDs', () => {
        expect((0, uuid_1.isValidUuid)('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });
    it('rejects invalid UUIDs', () => {
        expect((0, uuid_1.isValidUuid)('not-a-uuid')).toBe(false);
        expect((0, uuid_1.isValidUuid)('123456')).toBe(false);
    });
});
describe('generateUuid', () => {
    it('generates a valid UUID', () => {
        const uuid = (0, uuid_1.generateUuid)();
        expect((0, uuid_1.isValidUuid)(uuid)).toBe(true);
    });
});
