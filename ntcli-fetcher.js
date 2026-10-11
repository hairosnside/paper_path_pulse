'use strict';

const { execFile } = require('child_process');
const { parseSections } = require('./ntcli-parser');

const DEFAULT_PASSWORD = process.env.SSH_PASSWORD || 'il2w4lilky';

const NTCLI_COMMAND = [
  'echo "=== Settings ==="',
  'ntcli get Settings',
  'echo "=== Status ==="',
  'ntcli get Status',
  'echo "=== Supplies ==="',
  'ntcli get Supplies',
  'echo "=== Destination ==="',
  'ntcli get Destination'
].join('; ');

function isPrivateIPv4(ip) {
  const parts = String(ip || '').split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168);
}

function runCommand(executable, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(executable, args, {
      timeout: timeoutMs,
      maxBuffer: 20 * 1024 * 1024,
      env: process.env
    }, (error, stdout, stderr) => {
      if (error) {
        const detail = String(stderr || error.message || '').trim();
        reject(new Error(detail || `${executable} failed`));
        return;
      }
      resolve(String(stdout || ''));
    });
  });
}

async function fetchNtcli(printerIp, options) {
  const config = options || {};
  if (!isPrivateIPv4(printerIp)) throw new Error('Printer IP must be a private IPv4 address.');

  const sshUser = config.sshUser || process.env.SSH_USER || 'root';
  const sshPassword = config.sshPassword || DEFAULT_PASSWORD;
  const timeoutMs = Number(config.timeoutMs || 30000);
  const destination = `${sshUser}@${printerIp}`;
  const sshOptions = [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'UserKnownHostsFile=/dev/null',
    '-o', 'ConnectTimeout=7',
    '-o', 'ServerAliveInterval=5',
    '-o', 'ServerAliveCountMax=2'
  ];

  const startedAt = Date.now();
  let stdout;
  if (sshPassword) {
    stdout = await runCommand('sshpass', [
      '-p', sshPassword, 'ssh', ...sshOptions, destination, NTCLI_COMMAND
    ], timeoutMs);
  } else {
    stdout = await runCommand('ssh', [
      '-o', 'BatchMode=yes', ...sshOptions, destination, NTCLI_COMMAND
    ], timeoutMs);
  }

  if (!stdout.trim()) throw new Error(`NTCLI returned no output from ${printerIp}.`);
  const sections = parseSections(stdout);
  return {
    ok: true,
    ip: printerIp,
    fetchedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
    settings: sections.settings,
    status: sections.status,
    supplies: sections.supplies,
    destination: sections.destination
  };
}

module.exports = { fetchNtcli, parseSections, isPrivateIPv4 };