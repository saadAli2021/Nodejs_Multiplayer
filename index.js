// ********************** SETUP PORT AND SERVER ************************
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log("Server started");
});

// ********************** MAIN EVENTS *********************************
wss.on("connection", (ws) => {
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
  console.log("code : " + code + "   Reason : " + reason);
  switch (code) {
    case 1000:
      // Normal closure, no action needed.
      console.log("Client disconnected with code 1000 (Normal closure)");
      break;
    case 1001:
      // Client is going away, handle as needed.
      console.log("Client disconnected with code 1001 (Going away)");
      break;
    case 1006:
      // Connection abruptly closed, handle as needed.
      console.log(
        "Client disconnected with code 1006 (Connection abruptly closed)"
      );
      break;
    default:
      // Handle other error codes or unknown codes here.
      console.log(
        `Client disconnected with code ${code} and reason: ${reason}`
      );
      break;
  }
}

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
    case "isMasterClient": {
      getMasterClientStatus(ws, payload.playerId);
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
      break;
    }
    case "sendToOthers": {
      sendMessageToOthers(ws, payload);
      break;
    }
    case "sendToTarget": {
      sendMessageToTarget(ws, payload);
      break;
    }

    case "playerList": {
      getPlayerList(ws, payload);
      break;
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
  playerInfoMap.set(playerIdCounter + "", {
    socket: ws,
    playerName: payload.playerName,
    isMasterClient: false,
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
  // receiving roomID , playerID and message from client
  const roomID = payload.roomID;
  const playerID = payload.playerID;
  const messageToSend = payload.message;
  const playerName = getPlayerName(playerID);
  // creating a new object to send to clients
  const data = {
    action: "sendToAll",
    payload: {
      sender: playerID,
      message: messageToSend,
      playerName: playerName,
    },
  };
  // getting current players in room and sending the message to all of them
  const currentRoom = rooms.get(roomID);
  const currentPlayersInRoom = currentRoom.currentPlayers;
  currentPlayersInRoom.forEach((player) => {
    // getting refrence of player socket to send them the message
    const playerSocket = getSocketByPlayerID(player);
    if (playerSocket !== null) {
      playerSocket.send(JSON.stringify(data));
    } else {
      console.log("Error : Cannot find socket refrence of player :" + player);
    }
  });
}

function sendMessageToOthers(ws, payload) {
  // receiving roomID , playerID and message from client
  const roomID = payload.roomID;
  const playerID = payload.playerID;
  const messageToSend = payload.message;
  const playerName = getPlayerName(playerID);
  // creating a new object to send to clients
  const data = {
    action: "sendToOthers",
    payload: {
      sender: playerID,
      message: messageToSend,
      playerName: playerName,
    },
  };
  // getting current players in room and sending the message to all of them
  const currentRoom = rooms.get(roomID);
  const currentPlayersInRoom = currentRoom.currentPlayers;
  currentPlayersInRoom.forEach((player) => {
    //skip the sender player
    if (player === playerID) return;
    // getting refrence of player socket to send them the message
    const playerSocket = getSocketByPlayerID(player);
    if (playerSocket !== null) {
      playerSocket.send(JSON.stringify(data));
    } else {
      console.log("Error : Cannot find socket refrence of player :" + player);
    }
  });
}

//sendMessageToTarget
function sendMessageToTarget(ws, payload) {
  // receiving roomID , playerID and message from client
  const roomID = payload.roomID;
  const playerID = payload.senderID;
  const targetPlayerID = payload.targetID;
  const messageToSend = payload.message;
  const playerName = payload.senderName;
  // creating a new object to send to clients
  const data = {
    action: "sendToTarget",
    payload: {
      roomID: roomID,
      sender: playerID,
      message: messageToSend,
      playerName: playerName,
    },
  };
  // getting current players in room and sending the message to all of them
  const currentRoom = rooms.get(roomID);
  const currentPlayersInRoom = currentRoom.currentPlayers;
  currentPlayersInRoom.forEach((player) => {
    if (player === targetPlayerID) {
      // getting refrence of player socket to send them the message
      const playerSocket = getSocketByPlayerID(player);
      if (playerSocket !== null) {
        playerSocket.send(JSON.stringify(data));
      } else {
        console.log("Error : Cannot find socket refrence of player :" + player);
      }
    }
  });
}

function getMasterClientStatus(ws, playerID) {
  const status = isMasterClientByID(playerID);

  const data = {
    action: "isMasterClient",
    payload: {
      isMasterClient: status,
    },
  };

  ws.send(JSON.stringify(data));
}

function getSocketByPlayerID(playerID) {
  if (playerInfoMap.has(playerID)) {
    const playerInfo = playerInfoMap.get(playerID);
    return playerInfo.socket;
  } else {
    return null; // PlayerID not found in the map
  }
}

function getPlayerName(playerID) {
  if (playerInfoMap.has(playerID)) {
    const playerInfo = playerInfoMap.get(playerID);
    return playerInfo.playerName;
  } else return "No_Name";
}

function isMasterClientByID(playerID) {
  if (playerInfoMap.has(playerID)) {
    const playerInfo = playerInfoMap.get(playerID);
    return playerInfo.isMasterClient;
  }
}

function setMasterClient(playerId) {
  // Check if the player ID exists in the map
  if (playerInfoMap.has(playerId)) {
    // Get the player's info
    const playerInfo = playerInfoMap.get(playerId);

    // Update the isMasterClient property
    playerInfo.isMasterClient = true;

    // Update the player's info in the map
    playerInfoMap.set(playerId, playerInfo);

    console.log(`Player ${playerId} is now the master client.`);
  } else {
    console.log(`Player ${playerId} not found in the playerInfoMap.`);
  }
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
      roomID: roomIdCounter,
      roomName: roomIdCounter,
      currentPlayers: [],
    };
    targetRoom = newRoom;
    rooms.set(roomIdCounter + "", newRoom);
    //set the master client
    setMasterClient(playerID);

    console.log("New Room Created : " + targetRoom.roomName);
  }
  // joint the target room if space is available
  targetRoom.currentPlayers.push(playerID);
  console.log("Room Joined sucess : " + targetRoom.roomName);

  const data = {
    action: "roomJoined",
    payload: targetRoom,
  };
  ws.send(JSON.stringify(data));
  return targetRoom;
}

function getRoomList(ws) {
  const roomsArray = Array.from(rooms.values());
  const data = {
    action: "roomsList",
    payload: {
      roomsList: roomsArray,
    },
  };
  const roomsList = JSON.stringify(data);
  ws.send(roomsList);
}
function getPlayerList(ws, payload) {
  const senderID = payload.senderID;
  const senderSocket = getSocketByPlayerID(senderID);
  const roomID = payload.roomID;
  const room = rooms.get(roomID);
  let playersData = [];

  if (room) {
    const playersList = room.currentPlayers;

    playersList.forEach((playerID) => {
      let player = playerInfoMap.get(playerID);
      // adding a plarerID property
      player.playerID = playerID;

      if (player) playersData.push(player);
    });

    if (senderSocket) {
      var data = {
        action: "playerList",
        payload: {
          playerList: playersData,
        },
      };
      senderSocket.send(JSON.stringify(data));
    } else {
      console.log("Player not found!");
    }
  }
}
function getCurrentPlayersCount(roomID) {
  const room = rooms.get(roomID);
  if (room) {
    const currentPlayersCount = room.currentPlayers.length;
    return currentPlayersCount;
  }
}
