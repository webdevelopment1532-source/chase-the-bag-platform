# Stryker Mutation Testing - Sandbox Isolation Report

**Generated**: 2026-04-02T05:04:27.855Z

## Sandbox Session
- **Session ID**: 2026-04-02T04-49-49-164Z
- **Project**: chase-the-bag-platform
- **Target File**: src/games.ts

## Execution Environment

### System Information
| Property | Value |
|----------|-------|
| Platform | linux |
| Architecture | x64 |
| Node Version | v22.22.1 |
| CPU Cores | 16 |
| Total Memory | 15.34 GB |
| Available Memory | 7.71 GB |

### Isolation Configuration
- **Temp Directory**: `.stryker-sandbox-tmp` (cleaned after each mutation)
- **Concurrent Runners**: 1 (single-threaded for maximum isolation)
- **Max Test Runner Reuse**: 1 (process killed after each mutation)
- **Cleanup Policy**: Always (sandbox deleted after completion)

### Memory and Resource Management
```json
{
  "maxOldSpaceSize": "--max-old-space-size=2048",
  "heapSizeLimit": "Default Node.js heap",
  "isolateProcesses": true,
  "processPerMutation": true
}
```

## Jest Test Isolation
- ✅ Module Reset: Enabled (`resetModules: true`)
- ✅ Mock Clearing: Enabled (`clearMocks: true`)
- ✅ Mock Restoration: Enabled (`restoreMocks: true`)
- ✅ Force Exit: Enabled (`forceExit: true`)
- ✅ Cache Clearing: Before and after execution

## Stryker Isolation
- ✅ Process Isolation: Each mutation runs in dedicated process
- ✅ Sandbox Cleanup: Automatic after each mutation
- ✅ Concurrency: Single-threaded (no cross-process interference)
- ✅ Timeout Management: 30s per mutation, 1.5x factor for slow code

## Artifacts
- **HTML Report**: `/home/cyber44/chase-the-bag-platform/reports/mutation-sandbox/2026-04-02T04-49-49-164Z/index.html`
- **Logs**: `/home/cyber44/chase-the-bag-platform/reports/mutation-sandbox/2026-04-02T04-49-49-164Z/logs/`
- **Metadata**: `/home/cyber44/chase-the-bag-platform/reports/mutation-sandbox/2026-04-02T04-49-49-164Z/metadata.json`

## Running This Report
```bash
# View isolation report
cat /home/cyber44/chase-the-bag-platform/reports/mutation-sandbox/2026-04-02T04-49-49-164Z/isolation-report.md

# View HTML report (if available)
open /home/cyber44/chase-the-bag-platform/reports/mutation-sandbox/2026-04-02T04-49-49-164Z/index.html

# View logs
cat /home/cyber44/chase-the-bag-platform/reports/mutation-sandbox/2026-04-02T04-49-49-164Z/logs/stdout.log
cat /home/cyber44/chase-the-bag-platform/reports/mutation-sandbox/2026-04-02T04-49-49-164Z/logs/stderr.log
```

---
**Sandbox Version**: 1.0  
**Last Updated**: 2026-04-02T05:04:27.855Z
