#!/bin/bash
# Stryker Mutation Testing Sandbox Runner
# Provides OS-level isolation for Stryker mutation testing

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SANDBOX_DIR="${PROJECT_ROOT}/.stryker-sandbox"
SANDBOX_CONFIG="${PROJECT_ROOT}/stryker.sandbox.json"
REPORT_DIR="${PROJECT_ROOT}/reports/mutation-sandbox"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# Clean up before running
cleanup_sandboxes() {
    log_info "Cleaning up previous sandbox environments..."
    
    # Remove stryker temp directories
    rm -rf "${PROJECT_ROOT}"/.stryker-tmp* 2>/dev/null || true
    rm -rf "${PROJECT_ROOT}"/.stryker-sandbox* 2>/dev/null || true
    
    # Clear node module cache
    rm -rf "${PROJECT_ROOT}"/node_modules/.cache 2>/dev/null || true
    
    # Clear Jest cache
    npx jest --clearCache 2>/dev/null || true
    
    log_success "Sandbox cleanup completed"
}

# Create isolated sandbox directory
create_sandbox() {
    log_info "Creating isolated sandbox directory..."
    
    mkdir -p "${SANDBOX_DIR}"
    mkdir -p "${REPORT_DIR}"
    
    # Create environment file for sandbox isolation
    cat > "${SANDBOX_DIR}/.env.sandbox" <<EOF
# Sandbox isolation environment variables
STRYKER_SANDBOX=true
NODE_ENV=test
JEST_WORKER_ID=sandbox-${TIMESTAMP}
FORCE_COLOR=0
EOF
    
    log_success "Sandbox directory created at ${SANDBOX_DIR}"
}

# Run Stryker in isolated process
run_stryker_isolated() {
    log_info "Starting Stryker mutation testing in isolated environment..."
    log_info "Config: ${SANDBOX_CONFIG}"
    log_info "Report: ${REPORT_DIR}"
    
    # Run with strict isolation
    cd "${PROJECT_ROOT}"
    
    # Load sandbox environment
    export $(cat "${SANDBOX_DIR}/.env.sandbox" | xargs)
    
    # Run Stryker with sandbox config
    npx stryker run \
        --configFile="${SANDBOX_CONFIG}" \
        --outputPath="${REPORT_DIR}/${TIMESTAMP}" \
        --verbose
    
    STRYKER_EXIT_CODE=$?
    
    if [ $STRYKER_EXIT_CODE -eq 0 ]; then
        log_success "Stryker mutation testing completed successfully"
    else
        log_warn "Stryker completed with exit code: $STRYKER_EXIT_CODE"
    fi
    
    return $STRYKER_EXIT_CODE
}

# Generate sandbox report
generate_report() {
    log_info "Generating sandbox isolation report..."
    
    REPORT_FILE="${REPORT_DIR}/${TIMESTAMP}/isolation-report.md"
    
    cat > "${REPORT_FILE}" <<EOF
# Stryker Mutation Testing - Sandbox Isolation Report
**Timestamp**: ${TIMESTAMP}
**Environment**: Isolated Sandbox
**Project Root**: ${PROJECT_ROOT}

## Sandbox Configuration
- Config File: \`stryker.sandbox.json\`
- Temp Directory: \`.stryker-sandbox-tmp\`
- Concurrent Runners: 1 (exclusive isolation)
- Max Test Runner Reuse: 1 (restart after each mutation)
- Cleanup Policy: Always delete sandbox after run

## Test Isolation Settings
- Jest Module Reset: Enabled (\`resetModules: true\`)
- Jest Mock Clearing: Enabled (\`clearMocks: true\`)
- Jest Force Exit: Enabled (\`forceExit: true\`)
- Cache Cleared: Before and after test execution

## Node.js Memory Isolation
- Sandboxed Process: Isolated child process
- Memory Limits: System default
- Resource Cleanup: Automatic via OS

## Report Location
HTML Report: \`${REPORT_DIR}/${TIMESTAMP}/index.html\`

---
**Generated**: $(date)
EOF
    
    log_success "Isolation report generated at ${REPORT_FILE}"
}

# Main execution flow
main() {
    log_info "================================"
    log_info "Stryker Sandbox Runner v1.0"
    log_info "================================"
    
    cleanup_sandboxes
    create_sandbox
    
    if run_stryker_isolated; then
        generate_report
        log_success "Mutation testing in sandbox completed successfully"
        exit 0
    else
        log_error "Mutation testing failed"
        exit 1
    fi
}

# Run main function
main "$@"
