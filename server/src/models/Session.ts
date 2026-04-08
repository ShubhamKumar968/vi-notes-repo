import mongoose from 'mongoose'

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  keystrokeStats: {
    avgSpeed: Number,
    totalKeystrokes: Number,
    longPauses: Number,
  },
  pasteCount: { type: Number, default: 0 },
}, { timestamps: true })

export default mongoose.model('Session', sessionSchema)