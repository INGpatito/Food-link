import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { getFreePort } from './serverHelper.ts';

export interface FirefoxSession {
  port: number;
  contextId: string;
  navigate: (url: string, wait?: 'complete' | 'interactive' | 'none') => Promise<void>;
  setViewport: (width: number, height: number) => Promise<void>;
  evaluate: <T = any>(expression: string) => Promise<T>;
  getEvents: () => { logs: any[]; networkRequests: any[] };
  getConsoleErrors: () => string[];
  getGoogleFontsRequests: () => string[];
  close: () => Promise<void>;
}

export interface LaunchFirefoxOptions {
  width?: number;
  height?: number;
  timeoutMs?: number;
}

export async function launchFirefoxBiDi(options: LaunchFirefoxOptions = {}): Promise<FirefoxSession> {
  const width = options.width ?? 1280;
  const height = options.height ?? 800;
  const timeoutMs = options.timeoutMs ?? 15000;

  const port = await getFreePort();
  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'ff_bidi_profile_'));

  const firefoxBin = '/home/pato/.local/bin/firefox';

  const proc: ChildProcess = spawn(
    firefoxBin,
    [
      '--headless',
      '--profile',
      tmpProfile,
      '--remote-debugging-port',
      String(port),
      '--remote-allow-origins=*'
    ],
    {
      env: {
        ...process.env,
        MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: '1'
      },
      stdio: 'pipe'
    }
  );

  let ws: WebSocket | null = null;
  let nextId = 1;
  const pending = new Map<number, (res: any) => void>();
  const logs: any[] = [];
  const networkRequests: any[] = [];

  const send = (method: string, params: Record<string, any>): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('WebSocket connection not open'));
      }
      const id = nextId++;
      pending.set(id, (res) => {
        if (res.type === 'error' || res.error) {
          reject(new Error(`BiDi error [${res.error}]: ${res.message}`));
        } else {
          resolve(res.result);
        }
      });
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  // Poll until WebSocket connects
  const startTime = Date.now();
  let connected = false;

  while (Date.now() - startTime < timeoutMs) {
    if (proc.exitCode !== null) {
      throw new Error(`Firefox process terminated early with code ${proc.exitCode}`);
    }
    try {
      ws = new WebSocket(`ws://127.0.0.1:${port}/session`);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('WS connection timeout')), 1000);
        ws!.onopen = () => {
          clearTimeout(timer);
          resolve();
        };
        ws!.onerror = (err) => {
          clearTimeout(timer);
          reject(err);
        };
      });
      connected = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  if (!connected || !ws) {
    proc.kill('SIGKILL');
    fs.rmSync(tmpProfile, { recursive: true, force: true });
    throw new Error(`Failed to connect to Firefox BiDi on port ${port} within ${timeoutMs}ms`);
  }

  ws.onmessage = (evt) => {
    try {
      const data = JSON.parse(String(evt.data));
      if (data.id && pending.has(data.id)) {
        const cb = pending.get(data.id)!;
        pending.delete(data.id);
        cb(data);
      } else if (data.method === 'log.entryAdded') {
        logs.push(data.params);
      } else if (data.method === 'network.beforeRequestSent') {
        networkRequests.push(data.params);
      }
    } catch {}
  };

  // Initialize session
  await send('session.new', { capabilities: {} });

  // Subscribe to log and network events
  await send('session.subscribe', {
    events: ['log.entryAdded', 'network.beforeRequestSent']
  });

  // Get active browsing context
  const treeRes = await send('browsingContext.getTree', {});
  if (!treeRes.contexts || treeRes.contexts.length === 0) {
    throw new Error('No browsing context returned by Firefox');
  }
  // Active browsing context ID
  const contextId: string = treeRes.contexts[0].context;

  const setViewport = async (w: number, h: number): Promise<void> => {
    await send('browsingContext.setViewport', {
      context: contextId,
      viewport: { width: w, height: h }
    });
  };

  const navigate = async (url: string, wait: 'complete' | 'interactive' | 'none' = 'complete'): Promise<void> => {
    await send('browsingContext.navigate', {
      context: contextId,
      url,
      wait
    });
    // Apply initial viewport now that an HTTP context is loaded
    try {
      await setViewport(width, height);
    } catch {}
  };

  const evaluate = async <T = any>(expression: string): Promise<T> => {
    const res = await send('script.evaluate', {
      target: { context: contextId },
      expression,
      awaitPromise: true
    });
    if (res.type === 'exception') {
      throw new Error(`Evaluation failed: ${res.exceptionDetails?.text || JSON.stringify(res)}`);
    }
    const val = res.result?.value !== undefined ? res.result?.value : res.result?.result?.value;
    return val as T;
  };

  const getEvents = () => {
    return { logs: [...logs], networkRequests: [...networkRequests] };
  };

  const getConsoleErrors = (): string[] => {
    return logs
      .filter((l) => l.level === 'error')
      .map((l) => `${l.text || l.message || JSON.stringify(l)}`);
  };

  const getGoogleFontsRequests = (): string[] => {
    return networkRequests
      .map((req) => req.request?.url || '')
      .filter((url: string) => url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com'));
  };

  const close = async (): Promise<void> => {
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    } catch {}
    try {
      proc.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 200));
      if (proc.exitCode === null) {
        proc.kill('SIGKILL');
      }
    } catch {}
    try {
      fs.rmSync(tmpProfile, { recursive: true, force: true });
    } catch {}
  };

  return {
    port,
    contextId,
    navigate,
    setViewport,
    evaluate,
    getEvents,
    getConsoleErrors,
    getGoogleFontsRequests,
    close
  };
}
