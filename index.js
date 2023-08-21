// ********************** SETUP PORT AND SERVER ************************
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log("Server started");
});
// ********************** MAIN EVENTS *********************************
wss.on("connection", (ws) => {
  handle_NewConnection(ws);
  ws.on("message", (message) => {
    try {
      const playerData = JSON.parse(message);
      handle_ReceivedMessages(playerData.action, playerData.payload);
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }
  });

  ws.on("close", (code, reason) => {
    handle_ClientDisconnect(code, reason);
  });
});

wss.on("listening", () => {
  handle_ServerIsReady();
});
// ********************** EVENTS HANDLERS *********************************

// Handler when server is ready and starts listening for incoming connections
function handle_ServerIsReady() {
  console.log("server is listening to port 8080");
}
// A function to handle client Disconnection
function handle_ClientDisconnect(code, reason) {
  console.log(`Client disconnected: code ${code}, reason: ${reason}`);
}
// A function to handle new connection
function handle_NewConnection(ws) {}

// A function to Handle received data from the client
function handle_ReceivedMessages(action, payload) {
  switch (action) {
    case "playerData": {
      handlePlayerData(action, payload);
      break;
    }
    default: {
      console.log("Unknown action:", action);
      break;
    }
  }
}

/* ============================= helper functoisn ======================================== */

function sendPlayerData(ws) {
  const playerData = {
    action: "playerData",
    payload: {
      msgType: "playerData",
      playerName: "Alice",
      id: 123,
      colors: ["Red", "Green", "Blue", "Yellow", "Purple"],
    },
  };
  const jsonPlayerData = JSON.stringify(playerData);
  ws.send(jsonPlayerData);
}
function handlePlayerData(action, payload) {
  console.log("Player Message Type:", payload.msgType);
  console.log("Player Name:", payload.playerName);
  console.log("ID:", payload.id);
  console.log("Colors:", payload.colors);
}
