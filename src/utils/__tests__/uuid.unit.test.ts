import { isValidUuid, generateUuid } from '../uuid';

describe('isValidUuid', () => {
  it('validates correct UUIDs', () => {
    expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });
  it('rejects invalid UUIDs', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('123456')).toBe(false);
  });
});

describe('generateUuid', () => {
  it('generates a valid UUID', () => {
    const uuid = generateUuid();
    expect(isValidUuid(uuid)).toBe(true);
  });
});
