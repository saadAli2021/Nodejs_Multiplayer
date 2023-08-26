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
    case "roomsList": {
      getRoomList(ws);
      break;
    }

    case "sendToAll": {
      sendMessageToAll(ws, payload);
    }
    default: {
      console.log("Unknown action:", action);
      break;
    }
  }
}

function onPlayerJoin(ws, action, payload) {
  // generating Unique id for player
  playerIdCounter++;
  playerInfoMap.set(playerIdCounter, {
    socket: ws,
    playerName: payload.playerName,
  });

  console.log("New player ID " + playerIdCounter);
  // sending the playerID  to player
  const playerIdAssinged = {
    action: "playerIdAssinged",
    payload: {
      playerID: playerIdCounter,
    },
  };
  ws.send(JSON.stringify(playerIdAssinged));
}

/* ============================= SUB EVENTS ======================================== */

function sendMessageToAll(ws, payload) {
  const roomID = payload.roomID;
  const playerID = payload.playerID;

  const currentPlayersInRoom = rooms.get(roomID).currentPlayers;
  currentPlayersInRoom.forEach((player) => {});
}

function joinRoomById(ws, roomID, playerID) {
  const roomToJoin = rooms.get(roomID);
  const currentPlayersInRoom = roomToJoin.currentPlayers.count;
  if (currentPlayersInRoom < 4) {
    roomToJoin.currentPlayers.push(playerID);
  } else {
    console.log("Error : Room is already Full");
  }
}

function joinOrCreateRoom(ws, playerID) {
  let targetRoom = null;
  // find any empty space in the room
  for (const [roomID, room] of rooms) {
    const currentPlayersCount = getCurrentPlayersCount(roomID);
    if (currentPlayersCount < 4) {
      targetRoom = room;
      console.log("Joined existing room : " + room.roomName);
      break;
    }
  }
  // Creating A new Room if no space is available in any room
  if (targetRoom === null) {
    roomIdCounter++;
    const newRoom = {
      roomName: "Room" + roomIdCounter,
      currentPlayers: [playerID],
    };
    targetRoom = newRoom;
    rooms.set(roomIdCounter, newRoom);
    console.log("New Room Created : " + targetRoom.roomName);
  }
  // joint the target room if space is available
  targetRoom.currentPlayers.push(playerID);
  console.log("Room Joined sucess : " + targetRoom.roomName);
  // sending feedback to player
  const data = {
    action: "roomJoined",
    payload: targetRoom,
  };
  ws.send(JSON.stringify(data));
  // return room
  return targetRoom;
}

function getRoomList(ws) {
  const roomsArray = Array.from(rooms.values());

  const data = {
    action: "roomsList",
    payload: roomsArray,
  };
  const roomsList = JSON.stringify(data);
  ws.send(roomsList);
}

function getCurrentPlayersCount(roomID) {
  const room = rooms.get(roomID);

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
