import { generateSelfCode } from '../src/scraper';

describe('generateSelfCode', () => {
  it('should generate a code with the correct prefix and length', () => {
    const code = generateSelfCode('TEST', 6);
    expect(code.startsWith('TEST-')).toBe(true);
    expect(code.length).toBe(11); // 'TEST-' + 6 chars
  });
});
