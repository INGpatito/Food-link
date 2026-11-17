import net from 'node:net';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';

export interface TestServerInstance {
  port: number;
  baseUrl: string;
  stop: () => Promise<void>;
}

export interface TestServerOptions {
  useMemory?: boolean;
  timeoutMs?: number;
}

export async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (!addr || typeof addr === 'string') {
        srv.close(() => reject(new Error('Failed to obtain port')));
        return;
      }
      const port = addr.port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

export async function startTestServer(options: TestServerOptions = {}): Promise<TestServerInstance> {
  const useMemory = options.useMemory ?? false;
  const timeoutMs = options.timeoutMs ?? 10000;
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const projectRoot = path.resolve(import.meta.dirname, '../..');
  const standaloneScript = path.join(projectRoot, 'server', 'standalone.mjs');

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(port),
    API_PORT: String(port)
  };

  if (useMemory) {
    env.FOODLINK_DISABLE_PLACES_DB = '1';
    env.DB_HOST = '127.0.0.1';
    env.DB_PORT = '3306';
    env.DB_NAME = 'FOODLINK_NONE';
  }

  const args: string[] = [];
  if (!useMemory) {
    args.push('--env-file=.env');
  }
  args.push(standaloneScript);

  const proc: ChildProcess = spawn('node', args, {
    cwd: projectRoot,
    env,
    stdio: 'pipe'
  });

  const stop = (): Promise<void> => {
    return new Promise((resolve) => {
      if (proc.killed || proc.exitCode !== null) {
        return resolve();
      }
      let exited = false;
      proc.once('exit', () => {
        exited = true;
        resolve();
      });
      proc.kill('SIGTERM');
      setTimeout(() => {
        if (!exited) {
          try {
            proc.kill('SIGKILL');
          } catch {}
          resolve();
        }
      }, 2000);
    });
  };

  // Poll until healthy
  const startTime = Date.now();
  let online = false;

  while (Date.now() - startTime < timeoutMs) {
    await new Promise((r) => setTimeout(r, 100));
    if (proc.exitCode !== null) {
      throw new Error(`Server process exited prematurely with code ${proc.exitCode}`);
    }
    try {
      const res = await fetch(`${baseUrl}/api/places/nearby?lat=19.4326&lng=-99.1332`);
      if (res.status === 200) {
        online = true;
        break;
      }
    } catch {
      // Retry
    }
  }

  if (!online) {
    await stop();
    throw new Error(`Timed out waiting for test server on port ${port} after ${timeoutMs}ms`);
  }

  return { port, baseUrl, stop };
}
