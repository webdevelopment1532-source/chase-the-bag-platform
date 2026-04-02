# Stryker Sandbox Execution Environment Guide

This guide explains how to run Stryker mutation testing in isolated sandbox environments with guaranteed memory and process cleanup.

## Overview

The sandbox system provides three layers of isolation:

### 1. **OS-Level Process Isolation**
- Dedicated child processes for each mutation test
- Process termination and resource cleanup after completion
- Isolated file descriptors and environment variables

### 2. **Node.js Memory Isolation**
- `resetModules: true` - Clears require() cache between tests
- `maxTestRunnerReuse: 1` - Kills Jest worker after each mutation
- `forceExit: true` - Forces process termination (releases all resources)
- Separate temp directories per run (`.stryker-sandbox-tmp`)

### 3. **Jest Test Isolation**
- `clearMocks: true` - Clears all mock call history
- `resetMocks: true` - Resets mock implementations
- `restoreMocks: true` - Restores original implementations
- `--clearCache` - Clears Jest internal cache before run

## Available Commands

### Using VS Code Tasks (Recommended)

Press `Ctrl+Shift+B` (or `Cmd+Shift+B` on Mac) to open the task list:

#### **Option 1: Node.js Isolated Execution** (Recommended)
```
Stryker: Run in Sandbox (Node.js Isolated)
```
- Runs via `scripts/stryker-sandbox.js`
- Advanced process isolation with metadata logging
- HTML report in `reports/mutation-sandbox/[timestamp]/`
- Best for detailed analysis and debugging

#### **Option 2: Bash Shell Isolated Execution**
```
Stryker: Run in Sandbox (Bash Shell Isolated)
```
- Runs via `scripts/stryker-sandbox.sh`
- Operating system-level cleanup and logging
- Simpler output, direct control

#### **Option 3: Cleanup Sandboxes**
```
Stryker: Cleanup Sandboxes
```
- Removes all temporary sandbox directories
- Clears `.stryker-tmp`, `.stryker-sandbox`, `.stryker-sandbox-tmp`
- Safe to run between test sessions

#### **Option 4: View Latest Report**
```
Stryker: View Latest Report
```
- Lists all generated mutation test reports
- Shows timestamps and report locations

### Using npm Scripts

```bash
# Node.js isolation (advanced)
node scripts/stryker-sandbox.js

# Bash shell isolation (simple)
bash scripts/stryker-sandbox.sh

# Cleanup previous sandboxes
rm -rf .stryker-tmp .stryker-sandbox .stryker-sandbox-tmp

# Run Jest tests with isolation
npm run test:isolate

# Run Jest tests with cache clear
npm run test:clean
```

## Sandbox Configuration Files

### `stryker.sandbox.json`
**Strict sandbox configuration for mutation testing**

Key settings:
```json
{
  "maxTestRunnerReuse": 1,              // Restart Jest after each mutation
  "concurrency": 1,                     // Single-threaded (no parallel workers)
  "cleanTempDir": "always",             // Delete sandbox directory after each run
  "tempDirName": ".stryker-sandbox-tmp", // Isolated temp directory
  "timeoutMS": 30000,                   // 30-second timeout per mutation
  "timeoutFactor": 1.5                  // 1.5x slower code timeout
}
```

### `jest.config.js`
**Jest configuration with memory isolation**

Key settings:
```javascript
{
  clearMocks: true,        // Clear mock call history
  resetMocks: true,        // Reset mock implementations
  restoreMocks: true,      // Restore original mocks
  resetModules: true,      // Clear require cache
  forceExit: true          // Force process exit (releases resources)
}
```

### `.vscode/tasks.json`
**VS Code integrated tasks for sandbox execution**

- Defines 8 tasks for running/managing sandboxes
- Integrates with VS Code's test runner UI
- Provides isolated panels for each task type

## Execution Flow

### Node.js Sandbox Runner (`scripts/stryker-sandbox.js`)

```
1. Cleanup Previous Sandboxes
   ├─ Remove .stryker-tmp* directories
   ├─ Remove .stryker-sandbox* directories
   └─ Clear Jest cache

2. Create Sandbox Environment
   ├─ Create .stryker-sandbox metadata directory
   ├─ Write system information (OS, CPU, memory)
   ├─ Write resource limits configuration
   └─ Setup isolated environment variables

3. Run Stryker in Isolated Process
   ├─ Spawn isolated child process
   ├─ Pass stryker.sandbox.json config
   ├─ Capture stdout/stderr to logs
   └─ Kill process after completion

4. Generate Isolation Report
   ├─ Create reports/mutation-sandbox/[timestamp]/
   ├─ Write isolation-report.md with details
   ├─ Save metadata.json
   └─ Log stdout/stderr for debugging
```

### Bash Sandbox Runner (`scripts/stryker-sandbox.sh`)

```
1. Cleanup Sandboxes
   ├─ Remove .stryker-tmp* directories
   ├─ Remove .stryker-sandbox* directories
   └─ Clear Jest and Stryker caches

2. Create Sandbox Directory
   ├─ mkdir -p .stryker-sandbox
   ├─ mkdir -p reports/mutation-sandbox
   └─ Create .env.sandbox for isolation

3. Run Stryker Isolated
   ├─ Load sandbox environment
   ├─ Execute: npx stryker run --configFile stryker.sandbox.json
   └─ Capture exit code and output

4. Generate Report
   └─ Create reports/mutation-sandbox/[timestamp]/isolation-report.md
```

## Report Locations

All mutation testing reports are saved with timestamps:

```
reports/
└── mutation-sandbox/
    └── [TIMESTAMP]/              # Each run has unique directory
        ├── index.html            # HTML mutation report
        ├── isolation-report.md   # Detailed isolation info
        ├── metadata.json         # System & environment details
        ├── logs/
        │   ├── stdout.log        # Stryker stdout
        │   └── stderr.log        # Stryker stderr
        └── ...other stryker files
```

## Troubleshooting

### Sandbox Not Cleaning Up
```bash
# Manual cleanup
rm -rf .stryker-tmp .stryker-sandbox .stryker-sandbox-tmp
npx jest --clearCache
```

### Process Hanging
```bash
# Check for lingering Node processes
ps aux | grep node
ps aux | grep stryker

# Kill stray processes
pkill -f "stryker"
pkill -f "jest"
```

### Report Not Generated
```bash
# Check report directory
ls -la reports/mutation-sandbox/

# View isolation report
cat reports/mutation-sandbox/[latest-timestamp]/isolation-report.md
```

### Memory Issues
Edit `scripts/stryker-sandbox.js` and adjust:
```javascript
// Increase buffer size if needed
maxBuffer: 50 * 1024 * 1024  // 50MB
```

## Performance Tuning

### For Faster Mutations
```bash
# Reduce timeout factor (may increase false timeouts)
# Edit stryker.sandbox.json:
"timeoutFactor": 1.2  // was 1.5
```

### For More Thorough Testing
```bash
# Increase timeout
# Edit stryker.sandbox.json:
"timeoutMS": 60000  // was 30000
```

### For Debugging
```bash
# Run with Node.js inspector
node --inspect-brk scripts/stryker-sandbox.js

# Open DevTools at chrome://inspect when prompted
```

## Best Practices

1. **Run Cleanup Before Long Sessions**
   ```bash
   npm run test:clean
   ```

2. **Check Reports After Each Run**
   ```bash
   open reports/mutation-sandbox/*/index.html  # macOS
   xdg-open reports/mutation-sandbox/*/index.html  # Linux
   ```

3. **Review Isolation Reports**
   ```bash
   cat reports/mutation-sandbox/[timestamp]/isolation-report.md
   ```

4. **Monitor Memory During Runs**
   ```bash
   # In another terminal
   watch -n 1 'free -h'
   ```

5. **Commit Sandbox Configuration**
   ```bash
   git add stryker.sandbox.json jest.config.js .vscode/
   git commit -m "feat: add Stryker sandbox isolation configuration"
   ```

## Integration with CI/CD

For GitHub Actions:

```yaml
- name: Run Mutation Tests in Sandbox
  run: node scripts/stryker-sandbox.js
  timeout-minutes: 15

- name: Upload Reports
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: mutation-reports
    path: reports/mutation-sandbox/
```

## See Also

- [Stryker Configuration](https://stryker-mutator.io/docs/stryker-js/api/core/)
- [Jest Configuration](https://jestjs.io/docs/configuration)
- [Node.js Process Module](https://nodejs.org/api/process.html)
- [VS Code Tasks](https://code.visualstudio.com/docs/editor/tasks)

---

**Last Updated**: 2026-04-01
