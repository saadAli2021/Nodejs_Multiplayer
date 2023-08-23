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
      handle_ReceivedMessages(ws, playerData.action, playerData.payload);
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
// ********************** VARIABLES ***************************************
const playerInfoMap = new Map(); // Map to store connected clients
const rooms = new Map();

let playerIdCounter = 0;
let roomIdCounter = 0;
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
function handle_ReceivedMessages(ws, action, payload) {
  switch (action) {
    case "newConnection": {
      onPlayerJoin(ws, action, payload);
      break;
    }
    case "joinOrCreateRoom": {
      joinOrCreateRoom(ws, payload.playerId);
      break;
    }
    case "joinRoomById": {
      joinRoomById(ws, payload.roomID, payload.playerId);
      break;
    }
    default: {
      console.log("Unknown action:", action);
      break;
    }
  }
}

function onPlayerJoin(ws, action, payload) {
  idCounter++;
  playerInfoMap.set(idCounter, { playerName: "Alice" });
}

/* ============================= SUB EVENTS ======================================== */

function joinRoomById(ws, roomID, playerID) {
  const roomToJoin = rooms.get(roomID);
  const currentPlayersInRoom = roomToJoin.currentPlayers.count;
  if (currentPlayersInRoom < 4) {
    roomToJoin.currentPlayers.push(playerID);
  } else {
    console.log("Error : Room is already Full");
  }
}

function joinOrCreateRoom(ws, playerId) {
  let targetRoom = null;
  // find any empty space in the room
  for (const [roomID, room] of rooms) {
    const currentPlayersCount = getCurrentPlayersCount(roomID);
    if (currentPlayersCount < 4) {
      targetRoom = room;
      break;
    }
  }
  // Creating A new Room if no space is available in any room
  if (targetRoom === null) {
    roomIdCounter++;
    const newRoom = {
      roomName: "Room" + roomIdCounter,
      currentPlayers: [playerId],
    };
    targetRoom = newRoom;
    rooms.set(roomIdCounter, newRoom);
  }
  // joint the target room if space is available
  targetRoom.currentPlayers.push(playerId);

  return newRoom;
}

function getCurrentPlayersCount(roomId) {
  const room = rooms.get(roomId);

  if (room) {
    const currentPlayersCount = room.currentPlayers.length;
    return currentPlayersCount;
  } else {
    return 0; // Room not found
  }
}

/* ============================= Temporary Test functions ======================================== */
// function sendPlayerData(ws) {
//   const playerData = {
//     action: "playerData",
//     payload: {
//       msgType: "playerData",
//       playerName: "Alice",
//       id: 123,
//       colors: ["Red", "Green", "Blue", "Yellow", "Purple"],
//     },
//   };
//   const jsonPlayerData = JSON.stringify(playerData);
//   ws.send(jsonPlayerData);
// }
// function handlePlayerData(action, payload) {
//   console.log("Player Message Type:", payload.msgType);
//   console.log("Player Name:", payload.playerName);
//   console.log("ID:", payload.id);
//   console.log("Colors:", payload.colors);
// }
