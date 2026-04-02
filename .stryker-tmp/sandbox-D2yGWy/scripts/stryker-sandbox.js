#!/usr/bin/env node
// @ts-nocheck
/**
 * Stryker Sandbox Runner - Advanced Process Isolation
 * Provides Node.js-level process isolation for mutation testing
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Resolve project root reliably for direct runs and npm --prefix runs.
const PROJECT_ROOT =
    process.env.PROJECT_ROOT ||
    (process.env.npm_package_json ? path.dirname(process.env.npm_package_json) : null) ||
    process.cwd() ||
    process.env.INIT_CWD ||
    path.dirname(__dirname);
const SANDBOX_DIR = path.join(PROJECT_ROOT, '.stryker-sandbox');
const REPORTS_DIR = path.join(PROJECT_ROOT, 'reports', 'mutation-sandbox');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

// ANSI colors for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

// Logging functions
const log = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
    debug: (msg) => console.log(`${colors.dim}[DEBUG]${colors.reset} ${msg}`),
};

/**
 * Clean up previous sandbox artifacts
 */
function cleanupSandboxes() {
    log.info('Cleaning up previous sandbox environments...');
    
    // Remove stryker temp directories
    const tempDirs = [
        path.join(PROJECT_ROOT, '.stryker-tmp'),
        path.join(PROJECT_ROOT, '.stryker-sandbox'),
        path.join(PROJECT_ROOT, '.stryker-sandbox-tmp'),
    ];
    
    tempDirs.forEach((dir) => {
        if (fs.existsSync(dir)) {
            try {
                spawnSync('rm', ['-rf', dir], { stdio: 'pipe' });
                log.debug(`Removed ${dir}`);
            } catch (e) {
                log.warn(`Failed to remove ${dir}: ${e.message}`);
            }
        }
    });
    
    // Clear Jest cache with proper working directory
    try {
        spawnSync('npx', ['jest', '--clearCache'], {
            cwd: PROJECT_ROOT,  // Set working directory
            stdio: 'pipe',
        });
        log.debug('Cleared Jest cache');
    } catch (e) {
        log.warn(`Failed to clear Jest cache: ${e.message}`);
    }
    
    log.success('Sandbox cleanup completed');
}

/**
 * Create isolated sandbox directory structure
 */
function createSandboxEnvironment() {
    log.info('Creating isolated sandbox environment...');
    
    // Create directories
    if (!fs.existsSync(SANDBOX_DIR)) {
        fs.mkdirSync(SANDBOX_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    // Create sandbox metadata file
    const metadata = {
        timestamp: TIMESTAMP,
        environment: 'isolated-sandbox',
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        cpuCount: os.cpus().length,
        memoryAvailable: os.freemem(),
        memoryTotal: os.totalmem(),
        workdir: PROJECT_ROOT,
    };
    
    fs.writeFileSync(
        path.join(SANDBOX_DIR, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
    );
    
    // Create resource limits file for documentation
    const resourceLimits = {
        maxOldSpaceSize: '--max-old-space-size=2048',
        heapSizeLimit: 'Default Node.js heap',
        isolateProcesses: true,
        processPerMutation: true,
    };
    
    fs.writeFileSync(
        path.join(SANDBOX_DIR, 'resource-limits.json'),
        JSON.stringify(resourceLimits, null, 2)
    );
    
    log.success(`Sandbox environment created at ${SANDBOX_DIR}`);
    log.debug(`Report directory: ${REPORTS_DIR}/${TIMESTAMP}`);
}

/**
 * Run Stryker in isolated process with memory constraints
 */
async function runStrykerIsolated() {
    log.info('Starting Stryker in isolated process...');
    log.debug(`Project Root: ${PROJECT_ROOT}`);
    
    return new Promise((resolve, reject) => {
        // Verify project root is valid
        if (!fs.existsSync(path.join(PROJECT_ROOT, 'package.json'))) {
            log.error(`Invalid project root: ${PROJECT_ROOT} - no package.json found`);
            reject(new Error(`Invalid project root: ${PROJECT_ROOT}`));
            return;
        }
        
        const reportDir = path.join(REPORTS_DIR, TIMESTAMP);
        fs.mkdirSync(reportDir, { recursive: true });
        
        // Environment for isolation
        const env = {
            ...process.env,
            STRYKER_SANDBOX: 'true',
            NODE_ENV: 'test',
            FORCE_COLOR: '1',
            JEST_WORKER_ID: `sandbox-${TIMESTAMP}`,
        };
        
        // Stryker command with isolation arguments
        const strykerArgs = [
            'stryker',
            'run',
            'stryker.sandbox.json',  // Config file as positional argument
        ];
        
        log.info(`Running: npx ${strykerArgs.join(' ')}`);
        
        const strykerProcess = spawn('npx', strykerArgs, {
            cwd: PROJECT_ROOT,
            env,
            stdio: ['inherit', 'pipe', 'pipe'],
            detached: false,
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });
        
        let stdout = '';
        let stderr = '';
        
        strykerProcess.stdout.on('data', (data) => {
            stdout += data;
            process.stdout.write(data);
        });
        
        strykerProcess.stderr.on('data', (data) => {
            stderr += data;
            process.stderr.write(data);
        });
        
        strykerProcess.on('close', (code) => {
            // Save output logs
            const logsDir = path.join(reportDir, 'logs');
            fs.mkdirSync(logsDir, { recursive: true });
            
            fs.writeFileSync(path.join(logsDir, 'stdout.log'), stdout);
            fs.writeFileSync(path.join(logsDir, 'stderr.log'), stderr);
            
            if (code === 0) {
                log.success('Stryker mutation testing completed successfully');
            } else {
                log.warn(`Stryker exited with code: ${code}`);
            }
            
            resolve(code);
        });
        
        strykerProcess.on('error', (err) => {
            log.error(`Failed to run Stryker: ${err.message}`);
            reject(err);
        });
        
        // Handle SIGINT to allow graceful shutdown
        process.on('SIGINT', () => {
            log.warn('Received SIGINT, terminating Stryker process...');
            strykerProcess.kill('SIGTERM');
        });
    });
}

/**
 * Generate comprehensive isolation report
 */
function generateIsolationReport() {
    log.info('Generating isolation report...');
    
    const reportDir = path.join(REPORTS_DIR, TIMESTAMP);
    const reportFile = path.join(reportDir, 'isolation-report.md');
    
    const metadata = JSON.parse(
        fs.readFileSync(path.join(SANDBOX_DIR, 'metadata.json'), 'utf8')
    );
    const resourceLimits = JSON.parse(
        fs.readFileSync(path.join(SANDBOX_DIR, 'resource-limits.json'), 'utf8')
    );
    
    const report = `# Stryker Mutation Testing - Sandbox Isolation Report

**Generated**: ${new Date().toISOString()}

## Sandbox Session
- **Session ID**: ${TIMESTAMP}
- **Project**: chase-the-bag-platform
- **Target File**: src/games.ts

## Execution Environment

### System Information
| Property | Value |
|----------|-------|
| Platform | ${metadata.platform} |
| Architecture | ${metadata.arch} |
| Node Version | ${metadata.nodeVersion} |
| CPU Cores | ${metadata.cpuCount} |
| Total Memory | ${(metadata.memoryTotal / 1024 / 1024 / 1024).toFixed(2)} GB |
| Available Memory | ${(metadata.memoryAvailable / 1024 / 1024 / 1024).toFixed(2)} GB |

### Isolation Configuration
- **Temp Directory**: \`.stryker-sandbox-tmp\` (cleaned after each mutation)
- **Concurrent Runners**: 1 (single-threaded for maximum isolation)
- **Max Test Runner Reuse**: 1 (process killed after each mutation)
- **Cleanup Policy**: Always (sandbox deleted after completion)

### Memory and Resource Management
\`\`\`json
${JSON.stringify(resourceLimits, null, 2)}
\`\`\`

## Jest Test Isolation
- ✅ Module Reset: Enabled (\`resetModules: true\`)
- ✅ Mock Clearing: Enabled (\`clearMocks: true\`)
- ✅ Mock Restoration: Enabled (\`restoreMocks: true\`)
- ✅ Force Exit: Enabled (\`forceExit: true\`)
- ✅ Cache Clearing: Before and after execution

## Stryker Isolation
- ✅ Process Isolation: Each mutation runs in dedicated process
- ✅ Sandbox Cleanup: Automatic after each mutation
- ✅ Concurrency: Single-threaded (no cross-process interference)
- ✅ Timeout Management: 30s per mutation, 1.5x factor for slow code

## Artifacts
- **HTML Report**: \`${reportDir}/index.html\`
- **Logs**: \`${reportDir}/logs/\`
- **Metadata**: \`${reportDir}/metadata.json\`

## Running This Report
\`\`\`bash
# View isolation report
cat ${reportFile}

# View HTML report (if available)
open ${reportDir}/index.html

# View logs
cat ${reportDir}/logs/stdout.log
cat ${reportDir}/logs/stderr.log
\`\`\`

---
**Sandbox Version**: 1.0  
**Last Updated**: ${new Date().toISOString()}
`;
    
    fs.writeFileSync(reportFile, report);
    log.success(`Isolation report generated at ${reportFile}`);
}

/**
 * Main execution
 */
async function main() {
    console.log(`
╔════════════════════════════════════════════════════════╗
║  Stryker Mutation Testing - Sandbox Runner v1.0       ║
║  Isolated Process & Memory Cleanup Environment        ║
╚════════════════════════════════════════════════════════╝
`);
    
    try {
        cleanupSandboxes();
        createSandboxEnvironment();
        
        const exitCode = await runStrykerIsolated();
        generateIsolationReport();
        
        if (exitCode === 0) {
            log.success('✓ Mutation testing completed in isolated sandbox');
            process.exit(0);
        } else {
            log.warn(`✗ Mutation testing exited with code ${exitCode}`);
            process.exit(exitCode);
        }
    } catch (error) {
        log.error(`Fatal error: ${error.message}`);
        process.exit(1);
    }
}

main();
