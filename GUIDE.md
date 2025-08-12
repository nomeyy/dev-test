Changes:

- authentication strategy from database as default to jwt cause currently prisma adapter does not work in edge environment (https://github.com/ndom91/authjs-prisma-edge-example)
- update auth middleware to use auth form next auth instead of only checking cookie exiting (which is not quite secured)
- add 3 api/routes for sse
  - 1.  GET /api/sse for subscribing
  - 2.  GET /api/sse/stats for getting all connections
  - 3.  POST /api/sse/message for sending message
        body: message
        clientId: string // null mean sending broadcast to all clients
- create simple client components at src/features/home/components/Connections.tsx to test
  demo: https://q4mr-my.sharepoint.com/:v:/g/personal/annguyen_dev_q4mr_onmicrosoft_com/EZJu8JhGNiBCr1o758tz4SUBFkwcQHxukaw1T-lkPVAdig?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJPbmVEcml2ZUZvckJ1c2luZXNzIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXciLCJyZWZlcnJhbFZpZXciOiJNeUZpbGVzTGlua0NvcHkifX0&e=b8Dqc7
