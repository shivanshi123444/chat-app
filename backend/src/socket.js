const jwt = require('jsonwebtoken')
const Message = require('./models/Message')
const User = require('./models/User')

module.exports = (io) => {
  // Authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('Authentication error'))
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET)
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', async (socket) => {
    console.log(`${socket.user.username} connected`)

    // Mark user online
    await User.findByIdAndUpdate(socket.user.id, { isOnline: true })
    io.emit('user_online', { userId: socket.user.id, username: socket.user.username })

    // Join a room
    socket.on('join_room', (room) => {
      socket.join(room)
      socket.currentRoom = room
      console.log(`${socket.user.username} joined ${room}`)
    })

    // Send message
    socket.on('send_message', async ({ room, content }) => {
      try {
        const message = await Message.create({
          sender: socket.user.id,
          room,
          content
        })
        const populated = await message.populate('sender', 'username avatar')
        io.to(room).emit('receive_message', populated)
      } catch (err) {
        socket.emit('error', err.message)
      }
    })

    // Typing indicator
    socket.on('typing', ({ room }) => {
      socket.to(room).emit('user_typing', { username: socket.user.username })
    })

    socket.on('stop_typing', ({ room }) => {
      socket.to(room).emit('user_stop_typing', { username: socket.user.username })
    })

    // Disconnect
    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(socket.user.id, { isOnline: false })
      io.emit('user_offline', { userId: socket.user.id })
      console.log(`${socket.user.username} disconnected`)
    })
  })
}