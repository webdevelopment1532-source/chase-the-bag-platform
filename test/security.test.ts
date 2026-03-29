import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../src');

function readSrcFiles(): { file: string; content: string }[] {
  return fs.readdirSync(SRC_DIR)
    .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
    .map(f => ({ file: f, content: fs.readFileSync(path.join(SRC_DIR, f), 'utf8') }));
}

describe('Security — no secrets in source', () => {
  test('No hardcoded DISCORD_TOKEN= in src files', () => {
    const found = readSrcFiles().filter(({ content }) => content.includes('DISCORD_TOKEN='));
    expect(found.map(f => f.file)).toEqual([]);
  });

  test('No hardcoded DB passwords in src files', () => {
    // Should not contain literal password assignments like password: "somepass"
    const pattern = /password\s*[:=]\s*["'][^"'${}][^"']*["']/i;
    const found = readSrcFiles().filter(({ content }) => pattern.test(content));
    expect(found.map(f => f.file)).toEqual([]);
  });

  test('No AWS/private key literals in src files', () => {
    const pattern = /AKIA[0-9A-Z]{16}|-----BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY/;
    const found = readSrcFiles().filter(({ content }) => pattern.test(content));
    expect(found.map(f => f.file)).toEqual([]);
  });

  test('No hardcoded API secret literals in src files', () => {
    const pattern = /api[_-]?secret\s*[:=]\s*["'][^"'${}]{8,}/i;
    const found = readSrcFiles().filter(({ content }) => pattern.test(content));
    expect(found.map(f => f.file)).toEqual([]);
  });

  test('Sensitive env vars are read via process.env, not hardcoded', () => {
    const hardcoded = /DISCORD_TOKEN\s*=\s*["'][A-Za-z0-9._-]{10,}/;
    const found = readSrcFiles().filter(({ content }) => hardcoded.test(content));
    expect(found.map(f => f.file)).toEqual([]);
  });
});

describe('Security — input validation patterns', () => {
  test('api.ts validates game filter against allowlist', () => {
    const apiContent = fs.readFileSync(path.join(SRC_DIR, 'api.ts'), 'utf8');
    expect(apiContent).toContain('ALLOWED_GAMES');
    expect(apiContent).toContain('Invalid game filter');
  });

  test('api.ts validates affiliate status against allowlist', () => {
    const apiContent = fs.readFileSync(path.join(SRC_DIR, 'api.ts'), 'utf8');
    expect(apiContent).toContain('ALLOWED_AFFILIATE_STATUSES');
    expect(apiContent).toContain('Invalid affiliate status');
  });

  test('api.ts has rate limiting configured', () => {
    const apiContent = fs.readFileSync(path.join(SRC_DIR, 'api.ts'), 'utf8');
    expect(apiContent).toContain('rateLimit');
    expect(apiContent).toContain('sensitiveLimiter');
  });

  test('api.ts sets anti-indexing X-Robots-Tag header', () => {
    const apiContent = fs.readFileSync(path.join(SRC_DIR, 'api.ts'), 'utf8');
    expect(apiContent).toContain('X-Robots-Tag');
    expect(apiContent).toContain('noindex');
  });

  test('api.ts blocks unauthorized crawler user-agents', () => {
    const apiContent = fs.readFileSync(path.join(SRC_DIR, 'api.ts'), 'utf8');
    expect(apiContent).toContain('blockUnauthorizedCrawlers');
    expect(apiContent).toContain('Crawler access is forbidden');
    expect(apiContent).toContain('isApprovedCtbCrawler');
  });

  test('api.ts supports crawler IP allowlisting', () => {
    const apiContent = fs.readFileSync(path.join(SRC_DIR, 'api.ts'), 'utf8');
    expect(apiContent).toContain('CTB_CRAWLER_ALLOWED_IPS');
    expect(apiContent).toContain('getAllowedCrawlerIps');
    expect(apiContent).toContain('normalizeIp');
  });

  test('api.ts compares auth tokens with timing-safe check', () => {
    const apiContent = fs.readFileSync(path.join(SRC_DIR, 'api.ts'), 'utf8');
    expect(apiContent).toContain('timingSafeEqual');
  });

  test('api.ts enforces admin guard on sensitive endpoints', () => {
    const apiContent = fs.readFileSync(path.join(SRC_DIR, 'api.ts'), 'utf8');
    expect(apiContent).toContain('requireApiAdmin');
    expect(apiContent).toContain('Forbidden: admin access required');
  });

  test('api.ts requires authentication token', () => {
    const apiContent = fs.readFileSync(path.join(SRC_DIR, 'api.ts'), 'utf8');
    expect(apiContent).toContain('authenticateApi');
    expect(apiContent).toContain('Unauthorized');
  });

  test('advanced-commands.ts has rate limiting per user', () => {
    const content = fs.readFileSync(path.join(SRC_DIR, 'advanced-commands.ts'), 'utf8');
    expect(content).toContain('RATE_LIMIT_MS');
    expect(content).toContain('Please wait before using another command');
  });

  test('advanced-commands.ts restricts admin commands to allowed users', () => {
    const content = fs.readFileSync(path.join(SRC_DIR, 'advanced-commands.ts'), 'utf8');
    expect(content).toContain('ADMIN_USERS');
    expect(content).toContain('do not have permission');
  });

  test('advanced-commands.ts enforces payout and scraper policy checks', () => {
    const content = fs.readFileSync(path.join(SRC_DIR, 'advanced-commands.ts'), 'utf8');
    expect(content).toContain('assertPayoutEligible');
    expect(content).toContain('assertAuthorizedScraper');
  });
});

describe('Security — antifraud coverage', () => {
  test('antifraud.ts checks for high referral activity', () => {
    const content = fs.readFileSync(path.join(SRC_DIR, 'antifraud.ts'), 'utf8');
    expect(content).toContain('High referral activity');
  });

  test('antifraud.ts checks for excessive code generation', () => {
    const content = fs.readFileSync(path.join(SRC_DIR, 'antifraud.ts'), 'utf8');
    expect(content).toContain('Excessive code generation');
  });
});

describe('Security — affiliate code enforcement', () => {
  test('advanced-commands.ts uses env-backed affiliate code (not hardcoded)', () => {
    const content = fs.readFileSync(path.join(SRC_DIR, 'advanced-commands.ts'), 'utf8');
    expect(content).toContain('process.env.STAKE_AFFILIATE_CODE');
  });

  test('affiliates.ts uses env-backed affiliate code via function', () => {
    const content = fs.readFileSync(path.join(SRC_DIR, 'affiliates.ts'), 'utf8');
    expect(content).toContain('process.env.STAKE_AFFILIATE_CODE');
  });
});
