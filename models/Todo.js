const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
  task: { type: String, required: true },
  completed: { type: Boolean, default: false },
  timeTaken: { type: Number, default: 0 }, 
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

todoSchema.pre('save', function(next) {
  if (this.completed && !this.completedAt) {
    this.completedAt = Date.now();
    this.timeTaken = (this.completedAt - this.createdAt) / (1000 * 60); 
  }
  next();
});
const Todo = mongoose.model('Todo', todoSchema);
module.exports = Todo;
