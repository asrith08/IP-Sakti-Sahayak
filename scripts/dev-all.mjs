// Minimal dev launcher: starts the Vite frontend and the Express API together.
// Uses only Node's built-in child_process — no extra dependency.
// Both children are killed when this process exits (Ctrl+C, parent exit, etc).
import { spawn } from 'child_process';

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

function run(name, args) {
  const proc = spawn(npmCmd, args, { stdio: 'inherit', shell: false });
  proc.on('exit', (code) => {
    console.log(`[dev-all] ${name} exited (code ${code}), shutting down...`);
    shutdown();
  });
  return proc;
}

const children = [];
function shutdown() {
  for (const c of children) {
    if (!c.killed) c.kill();
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

children.push(run('api', ['run', 'dev:api']));
children.push(run('frontend', ['run', 'dev']));
