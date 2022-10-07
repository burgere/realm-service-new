const express = require('express')
const router = express.Router()
const sockets = require('../sockets')

/* GET lobbies listing. */
router.get('/', function (req, res, next) {
  const lobbies = []
  Object.keys(sockets.lobbies)
    .filter(id => Object.values(sockets.lobbies[id].players).length === 1)
    .forEach(key => {
      lobbies.push({
        players: sockets.lobbies[key].players,
        id: key,
        mode: sockets.lobbies[key].mode
      })
    })
  res.json({
    lobbies
  })
})

router.post('/', function (req, res, next) {
  const lobby = sockets.createLobby(req.body.mode)
  res.statusCode = 201
  res.json({
    lobby
  })
})

module.exports = router
