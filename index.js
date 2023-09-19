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
    const playerInfo = getPlayerInfoByWebSocket(ws);
    handle_ClientDisconnect(code, reason, playerInfo);
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
function handle_ClientDisconnect(code, reason, playerinfo) {
  let stackTrace = "";
  const { playerName, playerID, roomID, isMasterClient } = playerinfo;
  stackTrace =
    "[" +
    playerName +
    " with ID " +
    playerID +
    " of room " +
    roomID +
    " left \n";

  console.log(stackTrace + " " + isMasterClient);
  // remove the player from the playerInfoMap
  playerInfoMap.delete(playerID);

  let room = rooms.get(roomID);
  if (!room) console.log("room not found");
  // remove the player who left the game from room currentplayers
  removePlayerFromCurrentPlayersOfRoom(playerID, roomID);
  // if it was master client then create a new master client
  if (isMasterClient) {
    stackTrace += " he was a MasterClient \n";

    // make the player masterclient who is at zero index
    setMasterClient(room.currentPlayers[0]);
    stackTrace +=
      getPlayerName(room.currentPlayers[0]) +
      " is new masterclient with ID :" +
      room.currentPlayers[0] +
      " ]";
  }
  // display the currentplayer of the room
  console.log("players left ib the room " + room.currentPlayers);
  //if it was the last player in the room then delete the room

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
      console.log("Client disconnected with code 1006 (PlayerName : )");
      break;
    default:
      // Handle other error codes or unknown codes here.
      console.log(
        `Client disconnected with code ${code} and reason: ${reason}`
      );
      break;
  }
}

// Function to get playerName from WebSocket connection
function getPlayerInfoByWebSocket(ws) {
  for (const [key, playerInfo] of playerInfoMap) {
    if (playerInfo.socket === ws) {
      playerInfo.playerID = key;
      return playerInfo;
    }
  }
  // Return null or an appropriate default value if the player is not found
  return null;
}

function removePlayerFromCurrentPlayersOfRoom(playerID, roomID) {
  let room = rooms.get(roomID);
  let newlistOfPlayers = [];
  if (!room) console.log("room not foundi");
  if (room) {
    newlistOfPlayers = room.currentPlayers.filter((id) => id !== playerID);
    room.currentPlayers = newlistOfPlayers;
    rooms.set(roomID, room);
    console.log(" player removed sucess ");
  }

  console.log("---new list of current players---");
  rooms.get(roomID).currentPlayers.forEach((p) => {
    console.log(" [" + p + "] ");
  });
}

function addPlayerToCurrentPlayersOfRoom(playerID, roomID) {
  let room = rooms.get(roomID);

  if (!room) {
    console.log("room not found [addPlayerToCurrentPlayersOfRoom]");
    return;
  }
  let oldCurrentPlayers = room.currentPlayers;
  if (!oldCurrentPlayers) {
    console.log(
      "current players is empty or not found [addPlayerToCurrentPlayersOfRoom]"
    );
  }

  room.currentPlayers = [...oldCurrentPlayers, playerID];
  rooms.set(roomID, room);
  console.log("Updated currentPlayers:", rooms.get(roomID).currentPlayers);
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
    roomID: null,
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

function broadcastMessageInRoom(ws, data) {
  let roomID = getPlayerInfoByWebSocket(ws).roomID;
  if (!roomID) {
    console.log("roomID not found [broadcastMessageInRoom]");
    return;
  }
  const currentRoom = rooms.get(roomID);
  const currentPlayersInRoom = currentRoom.currentPlayers;
  currentPlayersInRoom.forEach((player) => {
    // getting refrence of player socket to send them the message
    const playerSocket = getSocketByPlayerID(player);
    if (playerSocket !== null) {
      playerSocket.send(data);
    } else {
      console.log("Error : Cannot find socket refrence of player :" + player);
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

  if (!roomToJoin) {
    console.log("Error: Room not found.");
    return;
  }

  const currentPlayersInRoom = roomToJoin.currentPlayers.length;

  if (currentPlayersInRoom >= 4) {
    console.log("Error: Room is already full.");
    return;
  }

  if (roomToJoin.currentPlayers.includes(playerID)) {
    console.log("Error: Player is already in the room.");
    return;
  }

  roomToJoin.currentPlayers.push(playerID);
  console.log("Player joined the room successfully.");
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
    targetRoom = {
      roomID: roomIdCounter.toString(),
      roomName: roomIdCounter.toString(),
      currentPlayers: [],
    };
    rooms.set(roomIdCounter.toString(), targetRoom);
    //set the master client
    setMasterClient(playerID);
    console.log("New Room Created : " + targetRoom.roomName);
  }
  // joint the target room
  addPlayerToCurrentPlayersOfRoom(playerID, targetRoom.roomID);
  //initialize the roomID field of that player in playerInfoMap
  setPlayerRoomID(playerID, targetRoom.roomID);
  console.log("Room Joined sucess : " + targetRoom.roomName);
  const data = {
    action: "roomJoined",
    payload: targetRoom,
  };
  ws.send(JSON.stringify(data));
  return targetRoom;
}

function setPlayerRoomID(playerID, roomID) {
  let player = playerInfoMap.get(playerID);
  if (player) {
    player.roomID = roomID;
    playerInfoMap.set(playerID, player);
    console.log("roomID updated for player " + player.playerName);
  } else {
    console.log("Player Not Found while [setPlayerRoomID()]");
  }
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
  broadcastMessageInRoom(ws, roomsList);
  //ws.send(roomsList);
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
