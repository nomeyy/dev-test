const express = require("express");
const cors = require("cors");
const sseManager = require("./sseManager");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/sse/:id", (req, res) => {
  const { id } = req.params;
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();
  res.write("\n");

  sseManager.addClient(id, res);

  req.on("close", () => {
    sseManager.removeClient(id);
  });
});

app.post("/send/:id", (req, res) => {
  const { id } = req.params;
  const { event, data } = req.body;
  sseManager.sendEvent(id, event, data);
  res.json({ success: true });
});

app.post("/broadcast", (req, res) => {
  const { event, data } = req.body;
  sseManager.broadcast(event, data);
  res.json({ success: true });
});

sseManager.startHeartbeat();

app.listen(3000, () =>
  console.log("SSE Server running on http://localhost:3000"),
);
