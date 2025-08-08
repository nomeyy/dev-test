const { EventSource } = require('eventsource');

console.log('Starting SSE test...\n');

// Connect to SSE endpoint
const eventSource = new EventSource('http://localhost:3000/api/sse');

eventSource.onopen = () => {
  console.log('Connected to SSE endpoint\n');
};

eventSource.onerror = (error) => {
  console.error('SSE connection error:', error);
};

// Listen for default messages
eventSource.onmessage = (event) => {
  console.log('Default message:', event.data);
};

// Listen for specific event types
eventSource.addEventListener('connected', (event) => {
  const data = JSON.parse(event.data);
  console.log('Connected event:', data);
  console.log('Client ID:', data.clientId);
  console.log('');
});

eventSource.addEventListener('heartbeat', (event) => {
  const data = JSON.parse(event.data);
  console.log('💓 Heartbeat:', data.timestamp);
});

eventSource.addEventListener('test', (event) => {
  const data = JSON.parse(event.data);
  console.log('   Test event received!');
  console.log('   Message:', data.message);
  console.log('   Sender:', data.sender);
  console.log('   Timestamp:', data.timestamp);
  console.log('');
});

eventSource.addEventListener('broadcast', (event) => {
  const data = JSON.parse(event.data);
  console.log('  Broadcast event:', data);
  console.log('');
});

// Send test messages after connection
setTimeout(() => {
  console.log('Sending test message...\n');
  fetch('http://localhost:3000/api/sse/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'test',
      message: 'Hello from test script!',
    }),
  })
    .then(res => res.json())
    .then(data => {
      console.log('📤 Test message sent:', data.message);
      console.log('');
    })
    .catch(err => console.error('Error sending test message:', err));
}, 2000);

// Send broadcast message
setTimeout(() => {
  console.log('Sending broadcast message...\n');
  fetch('http://localhost:3000/api/sse/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'broadcast',
      message: 'Broadcast to all clients!',
    }),
  })
    .then(res => res.json())
    .then(data => {
      console.log('  Broadcast sent:', data.message);
      console.log('');
    })
    .catch(err => console.error('Error sending broadcast:', err));
}, 4000);

// Close connection after 60 seconds
setTimeout(() => {
  console.log('Closing connection...');
  eventSource.close();
  process.exit(0);
}, 60000);

console.log('Listening for SSE events... (will run for 60 seconds)\n');
