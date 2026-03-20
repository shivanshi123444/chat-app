const router = require('express').Router()
const Message = require('../models/Message')
const auth = require('../middleware/auth')

// Get messages for a room
router.get('/:room', auth, async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room })
      .populate('sender', 'username avatar')
      .sort({ createdAt: 1 })
      .limit(50)
    res.json(messages)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router