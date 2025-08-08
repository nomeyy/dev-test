To create SSE connection, use the following URL:

/api/sse?userId=1

To send event to user, use the following URL:

/api/sse

Request body (user):

```json
{
  "type": "user",
  "event": "message",
  "data": {
    "hello": "world"
  },
  "userId": "1"
}
```

Request body (broadcast):

```json
{
  "type": "broadcast",
  "event": "message",
  "data": {
    "hello": "world"
  }
}
```
