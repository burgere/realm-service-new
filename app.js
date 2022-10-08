const express = require('express')
const app = express()
const port = process.env.PORT || 3001
const path = require('path')
const cookieParser = require('cookie-parser')
const sockets = require('./sockets')
const logger = require('morgan')

const indexRouter = require('./routes/index')
const lobbiesRouter = require('./routes/lobbies')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', indexRouter)
app.use('/lobbies', lobbiesRouter)

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
})

app.get('/lobby-objs', function (req, res, next) {
  res.json({
    lobbies: Object.keys(sockets.lobbies).length
  })
})

app.listen(port, () => console.log(`Realm multiplayer service listening on port ${port}`))
sockets.setupSocketConnection(app)
