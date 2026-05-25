const WebSocket = require('ws');

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

const HOST = process.argv.includes('--host') ? process.argv[process.argv.indexOf('--host') + 1] : 'localhost';
const PORT = process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : '5000';

async function postJson(path, body) {
  const url = `http://${HOST}:${PORT}${path}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw json;
    return json;
  } catch (e) {
    throw e;
  }
}

async function loginJson(path, body) {
  return postJson(path, body);
}

async function ensureAccount(role, baseCodename) {
  // try to register with a timestamped codename to avoid collisions
  const codename = `${baseCodename}-${Date.now().toString().slice(-6)}`;
  const password = 'TestPass123';

  try {
    const res = await postJson('/api/auth/register', { codename, password, role });
    return { id: res.id, codename, password };
  } catch (e) {
    // if registration fails because codename exists, try login with baseCodename
    try {
      const loginRes = await loginJson('/api/auth/login', { codename: baseCodename, password });
      return { id: loginRes.id, codename: baseCodename, password };
    } catch (err) {
      // fallback: try login with the timestamped codename if register partially succeeded
      try {
        const loginRes = await loginJson('/api/auth/login', { codename, password });
        return { id: loginRes.id, codename, password };
      } catch (err2) {
        throw new Error(`Failed to create or login ${role}: ${JSON.stringify(e)}`);
      }
    }
  }
}

async function run() {
  if (typeof fetch === 'undefined') {
    console.error('Global fetch is not available in this Node runtime. Please run on Node >=18 or provide a fetch polyfill.');
    process.exit(1);
  }

  console.log(`Using server http://${HOST}:${PORT}`);

  // create tracker and soldier accounts
  console.log('Creating tracker account...');
  const tracker = await ensureAccount('tracker', 'tracker-echo');
  console.log('Tracker:', tracker);

  console.log('Creating soldier account...');
  const soldier = await ensureAccount('soldier', 'soldier-alpha');
  console.log('Soldier:', soldier);

  // connect WS clients
  const wsTracker = new WebSocket(`ws://${HOST}:${PORT}/ws`);
  const wsSoldier = new WebSocket(`ws://${HOST}:${PORT}/ws`);

  await Promise.all([
    new Promise((resolve) => {
      wsTracker.on('open', () => {
        console.log('Tracker WS connected');
        wsTracker.send(JSON.stringify({ type: 'register', data: { userId: tracker.id, codename: tracker.codename, role: 'tracker' } }));
        resolve();
      });
      wsTracker.on('message', (m) => console.log('Tracker recv:', m.toString()));
      wsTracker.on('error', (e) => console.error('Tracker WS error', e));
    }),
    new Promise((resolve) => {
      wsSoldier.on('open', () => {
        console.log('Soldier WS connected');
        wsSoldier.send(JSON.stringify({ type: 'register', data: { userId: soldier.id, codename: soldier.codename, role: 'soldier' } }));
        resolve();
      });
      wsSoldier.on('message', (m) => console.log('Soldier recv:', m.toString()));
      wsSoldier.on('error', (e) => console.error('Soldier WS error', e));
    }),
  ]);

  // give server time
  await wait(1000);

  const locationMsg = {
    type: 'locationUpdate',
    data: { soldierId: soldier.id, latitude: 37.7749, longitude: -122.4194, accuracy: 8 },
  };

  console.log('Soldier sending locationUpdate');
  wsSoldier.send(JSON.stringify(locationMsg));

  // wait and fetch debug endpoints
  await wait(800);
  try {
    const conRes = await fetch(`http://${HOST}:${PORT}/api/debug/connections`);
    const cons = await conRes.json();
    console.log('Debug connections:', JSON.stringify(cons, null, 2));

    const locRes = await fetch(`http://${HOST}:${PORT}/api/debug/locations`);
    const locs = await locRes.json();
    console.log('Debug locations:', JSON.stringify(locs, null, 2));

    const logRes = await fetch(`http://${HOST}:${PORT}/api/debug/logs`);
    const logs = await logRes.json();
    console.log('Recent logs (tail 20):', JSON.stringify(logs.slice(-20), null, 2));
  } catch (e) {
    console.error('Failed to fetch debug endpoints', e);
  }

  // wait for broadcasts to arrive
  await wait(2000);

  console.log('Closing sockets');
  wsSoldier.close();
  wsTracker.close();

  await wait(500);
  process.exit(0);
}

run().catch((e) => {
  console.error('ws-client-auto failed', e);
  process.exit(1);
});
