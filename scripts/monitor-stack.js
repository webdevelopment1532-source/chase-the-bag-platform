#!/usr/bin/env node

require('dotenv').config();

const API_PORT = Number(process.env.API_PORT || 3001);
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 5173);
const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN || '';
const API_ADMIN_ID = process.env.API_ADMIN_ID || 'dashboard-admin';

function statusIcon(ok) {
  return ok ? 'OK' : 'FAIL';
}

async function checkEndpoint(name, url, headers = {}) {
  const started = Date.now();
  try {
    const res = await fetch(url, { headers });
    const latency = Date.now() - started;
    return {
      name,
      ok: res.ok,
      status: res.status,
      latency,
      detail: res.ok ? 'reachable' : `http ${res.status}`,
    };
  } catch (error) {
    const latency = Date.now() - started;
    return {
      name,
      ok: false,
      status: 0,
      latency,
      detail: error instanceof Error ? error.message : 'unknown error',
    };
  }
}

async function run() {
  const frontendPorts = [FRONTEND_PORT, 5174, 5175].filter((value, index, all) => all.indexOf(value) === index);
  let frontendCheck = null;
  for (const port of frontendPorts) {
    const result = await checkEndpoint('Frontend', `http://127.0.0.1:${port}/`);
    if (result.ok) {
      frontendCheck = {
        ...result,
        detail: `reachable on :${port}`,
      };
      break;
    }
    if (!frontendCheck) {
      frontendCheck = result;
    }
  }

  const checks = await Promise.all([
    Promise.resolve(frontendCheck),
    checkEndpoint('API overview', `http://127.0.0.1:${API_PORT}/api/overview`, {
      authorization: API_AUTH_TOKEN ? `Bearer ${API_AUTH_TOKEN}` : '',
      'x-admin-user': API_ADMIN_ID,
    }),
    checkEndpoint('Exchange overview', `http://127.0.0.1:${API_PORT}/api/exchange/overview`, {
      authorization: API_AUTH_TOKEN ? `Bearer ${API_AUTH_TOKEN}` : '',
      'x-admin-user': API_ADMIN_ID,
    }),
  ]);

  console.log('=== Chase The Bag Stack Monitor ===');
  console.log(`API Port: ${API_PORT}`);
  console.log(`Frontend Port: ${FRONTEND_PORT}`);
  console.log('');

  for (const item of checks) {
    const ms = `${item.latency}ms`;
    console.log(`${statusIcon(item.ok)}  ${item.name.padEnd(18)} status=${String(item.status).padEnd(3)} latency=${ms.padEnd(8)} ${item.detail}`);
  }

  const failed = checks.filter((item) => !item.ok);
  if (failed.length) {
    process.exitCode = 1;
    return;
  }

  console.log('');
  console.log('All monitored services are healthy.');
}

run();