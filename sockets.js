var websockets = require('ws');
var http = require('http');
const {
    v1: uuidv1,
    v4: uuidv4,
} = require('uuid');

let server
let wss

/**
 * Player lobbies/matches, keyed by uuid
 * {
 *      players: Array<Player>
 *      sockets: Map<playerID, socket>
 * }
 */
let lobbies = {}

const setupSocketConnection = (app) => {
    server = http.createServer(app)
    wss = new websockets.Server({ server })

    wss.on('connection', socket => {
        socket.on('message', message => {
            parseMessage(socket, message)
        })
        // socket.send('Websocket initialized')
    })
    server.listen(process.env.PORT || 8999, () => {
        console.log(`Server started on port ${server.address().port}`);
    })
}

const parseMessage = (socket, message) => {
    let messageString = message.toString()
    let messageObject = JSON.parse(messageString)
    // TODO: Create separate notification to create a lobby
    console.log(`Type: ${messageObject.type}`)
    switch (messageObject.type) {
        case 'playerConnected':
            handlePlayerConnected(messageObject, socket)
            break
        case 'playerDisconnected':
            handlePlayerDisconnected(messageObject)
            break
        case 'startGame':
            handleStartGame(messageObject)
            break
        case 'playerReady':
            handlePlayerReady(messageObject)
            break
        case 'gameEvents':
            handleGameEvents(messageObject)
            break
        case 'gameState':
            handleGameState(messageObject)
            break
        case 'sequenceStart':
            handleSequenceStart(messageObject)
            break
        case 'advanceSequence':
            handleSequenceAdvanced(messageObject)
            break;
        case 'sequenceEnd':
            handleSequenceEnd(messageObject)
            break
        case 'cardSequencePrompt':
            handleCardSequencePrompt(messageObject)
            break
        case 'cardPrompt':
            handleCardPrompt(messageObject)
            break
        case 'endTurn':
            handleEndTurn(messageObject)
            break
    }
}

const handlePlayerConnected = (messageObject, socket) => {
    let player = messageObject.payload.player
    let lobbyID = messageObject.payload.lobbyID
    if (addPlayerToLobby(player, lobbyID, socket)) {
        messageObject.payload.players = Object.values(lobbies[lobbyID].players)
        sendToPlayersInMatch(lobbyID, messageObject)
    }
}

const handlePlayerDisconnected = messageObject => {
    let playerThatLeft = messageObject.payload.player
    let { lobbyID } = playerThatLeft
    let updatedPlayers = Object.values(lobbies[lobbyID].players).filter(player => player.id != playerThatLeft.id)
    lobbies[lobbyID].players = convertArrayToObject(updatedPlayers)
    lobbies[lobbyID].sockets[playerThatLeft.id].terminate()
    delete lobbies[lobbyID].sockets[playerThatLeft.id]

    messageObject.payload.players = Object.values(lobbies[lobbyID].players)

    if (Object.values(lobbies[lobbyID].players).length === 0) {
        delete lobbies[lobbyID]
    }

    sendToPlayersInMatch(lobbyID, messageObject)
}

const handlePlayerReady = messageObject => {
    sendToPlayersInMatch(messageObject.payload.player.lobbyID, messageObject)
}

const handleStartGame = messageObject => {
    let player = messageObject.payload.player
    sendToPlayersInMatch(player.lobbyID, messageObject)
}

const handleGameEvents = messageObject => {
    sendToPlayersInMatch(messageObject.payload.player.lobbyID, messageObject)
}

const handleGameState = messageObject => {
    const lobbyID = messageObject.payload.player.lobbyID
    if (messageObject.payload.forBothPlayers) {
        sendToPlayersInMatch(lobbyID, messageObject)
    } else {
        sendToPlayerInMatch(lobbyID, messageObject)
    }
}

const handleSequenceStart = messageObject => {
    sendToPlayersInMatch(messageObject.payload.player.lobbyID, messageObject)
}

const handleSequenceAdvanced = messageObject => {
    sendToPlayersInMatch(messageObject.payload.player.lobbyID, messageObject)
}

const handleSequenceEnd = messageObject => {
    sendToPlayersInMatch(messageObject.payload.player.lobbyID, messageObject)
}

const handleEndTurn = messageObject => {
    sendToPlayersInMatch(messageObject.payload.player.lobbyID, messageObject)
}

const handleCardSequencePrompt = messageObject => {
    sendToPlayerInMatch(messageObject.payload.player.lobbyID, messageObject)
}

const handleCardPrompt = messageObject => {
    sendToPlayersInMatch(messageObject.payload.player.lobbyID, messageObject)
}

const createLobby = mode => {
    const newLobbyID = uuidv4()
    const newLobby = {
        players: {},
        sockets: {},
        id: newLobbyID,
        mode
    }
    lobbies[newLobbyID] = newLobby
    return newLobby
}

const addPlayerToLobby = (player, lobbyID, socket) => {
    if (lobbyID !== null && Object.values(lobbies[lobbyID].players).length < 2) {
        player.lobbyID = lobbyID
        lobbies[lobbyID].players[player.id] = player
        lobbies[lobbyID].sockets[player.id] = socket
        return true
    }
    return false
}

const sendToOpponentInMatch = (lobbyID, message) => {
    const opponentID = Object.values(lobbies[lobbyID].players).filter(player => player.id === message.payload.player.id)[0].id
    let sockets = lobbies[lobbyID].sockets
    let socket = sockets[opponentID]
    if (socket.readyState == websockets.OPEN) {
        socket.send(JSON.stringify(message))
    }
}

const sendToPlayerInMatch = (lobbyID, message) => {
    const playerID = Object.values(lobbies[lobbyID].players).filter(player => player.id === message.payload.player.id)[0].id
    let sockets = lobbies[lobbyID].sockets
    let socket = sockets[playerID]
    if (socket.readyState == websockets.OPEN) {
        socket.send(JSON.stringify(message))
    }
}

const sendToPlayersInMatch = (lobbyID, message) => {
    if (!lobbies[lobbyID]) {
        return
    }
    let sockets = lobbies[lobbyID].sockets
    for (const id in sockets) {
        let socket = sockets[id]
        if (socket.readyState == websockets.OPEN) {
            console.log(`${message.type} playerID: ${id}`)
            socket.send(JSON.stringify(message))
        }
    }
}

const startEmptyMatch = lobbyID => {
    let match = buildEmptyMatch()
    let players = Object.values(lobbies[lobbyID].players)
    const activePlayer = players[Math.floor(Math.random() * players.length)];
    match.activePlayerID = activePlayer.id
    match.players = {}
    players.forEach(player => {
        if (player.id !== activePlayer.id) {
            player.gold = 3
        }
        match.players[player.id] = player
    })
    return match
}

const buildEmptyMatch = () => {
    return {
        players: {},
        stack: [],
        inEffect: [],
        events: [],
        location: null,
        activePlayerID: null,
        roundCount: 1,
        sequenceQueue: []
    }
}

const convertArrayToObject = (array, key) => {
    const initialValue = {};
    return array.reduce((obj, item) => {
        return {
            ...obj,
            [item[key]]: item,
        };
    }, initialValue);
};

module.exports = { setupSocketConnection, lobbies, createLobby }
