const WebSocket = require('ws');

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function run() {
  console.log('WS Test: connecting to ws://localhost:5000/ws');
  const wsTracker = new WebSocket('ws://localhost:5000/ws');
  const wsSoldier = new WebSocket('ws://localhost:5000/ws');

  await Promise.all([
    new Promise((resolve) => {
      wsTracker.on('open', () => {
        console.log('Tracker connected');
        wsTracker.send(
          JSON.stringify({
            type: 'register',
            data: { userId: 'tracker-1', codename: 'TrackerOne', role: 'tracker' },
          })
        );
        resolve();
      });

      wsTracker.on('message', (m) => {
        console.log('Tracker recv:', m.toString());
      });

      wsTracker.on('error', (e) => console.error('Tracker error', e));
    }),

    new Promise((resolve) => {
      wsSoldier.on('open', () => {
        console.log('Soldier connected');
        wsSoldier.send(
          JSON.stringify({
            type: 'register',
            data: { userId: 'soldier-1', codename: 'SoldierOne', role: 'soldier' },
          })
        );
        resolve();
      });

      wsSoldier.on('message', (m) => {
        console.log('Soldier recv:', m.toString());
      });

      wsSoldier.on('error', (e) => console.error('Soldier error', e));
    }),
  ]);

  // give server a moment to register both
  await wait(1500);

  const location = {
    type: 'locationUpdate',
    data: { soldierId: 'soldier-1', latitude: 37.7749, longitude: -122.4194, accuracy: 10 },
  };

  console.log('Soldier sending locationUpdate', location);
  wsSoldier.send(JSON.stringify(location));

  // give the server a moment and then query debug endpoints to see runtime state
  await wait(500);
  try {
    const conRes = await fetch('http://localhost:5000/api/debug/connections');
    const cons = await conRes.json();
    console.log('Debug connections:', JSON.stringify(cons, null, 2));

    const locRes = await fetch('http://localhost:5000/api/debug/locations');
    const locs = await locRes.json();
    console.log('Debug locations:', JSON.stringify(locs, null, 2));
    
    const logRes = await fetch('http://localhost:5000/api/debug/logs');
    const logs = await logRes.json();
    console.log('Debug logs:', JSON.stringify(logs.slice(-20), null, 2));
  } catch (e) {
    console.error('Failed to fetch debug endpoints', e);
  }

  // wait a bit for broadcast to arrive
  await wait(3000);

  console.log('Closing sockets');
  wsSoldier.close();
  wsTracker.close();

  await wait(500);
  process.exit(0);
}

run().catch((e) => {
  console.error('WS Test failed', e);
  process.exit(1);
});
