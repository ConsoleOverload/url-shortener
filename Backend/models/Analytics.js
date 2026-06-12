import mongoose from 'mongoose';

/**
 * MongoDB Sharding Strategy Hint:
 * For high-scale analytics, write operations are frequent. Sharding by `{ shortId: "hashed" }` ensures
 * writing logs is distributed evenly across all shards, avoiding write bottlenecks.
 * If query patterns heavily rely on recent data, a compound shard key of `{ shortId: 1, timestamp: 1 }`
 * could be considered, though it may lead to sequential write hotspots on the max shard.
 */

const clickLogSchema = new mongoose.Schema({
  shortId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  ip: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: 'Unknown'
  },
  referrer: {
    type: String,
    default: 'Direct'
  },
  country: {
    type: String,
    default: 'Unknown'
  },
  city: {
    type: String,
    default: 'Unknown'
  },
  device: {
    type: String,
    default: 'Desktop'
  },
  browser: {
    type: String,
    default: 'Unknown'
  }
});

// Compound index for retrieving analytics reports sorted by timestamp for a specific short ID
clickLogSchema.index({ shortId: 1, timestamp: -1 });

const ClickLog = mongoose.model('ClickLog', clickLogSchema);
export default ClickLog;
