const mongoose = require('mongoose');

const graphDataSchema = new mongoose.Schema({
  task: {
    type: String,
    required: true
  },
  timeTaken: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  }
});

const GraphData = mongoose.model('GraphData', graphDataSchema);

module.exports = GraphData;
