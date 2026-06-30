import mongoose from 'mongoose';

/**
 * MongoDB Sharding Strategy Hint:
 * In a distributed, horizontally scaled environment, we should shard the Url collection by the hash of `shortId`.
 * Shard key: { shortId: "hashed" }
 * Reason: `shortId` is highly unique and evenly distributed (due to nanoid/Base62 distribution). 
 * This ensures writes and reads are evenly distributed across all shards, avoiding hot spots.
 */

const urlSchema = new mongoose.Schema({
  shortId: {
    type: String,
    required: true,
    unique: true, // MongoDB implicitly creates a unique index, redundant index flag removed
    trim: true
  },
  originalUrl: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now // Removed index since we don't query range sorting on high-traffic paths
  },
  expiresAt: {
    type: Date,
    // TTL Index: MongoDB background process runs every 60 seconds to delete documents where expiresAt <= current time.
    index: { expires: 0 }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  title: {
    type: String,
    trim: true,
    default: null
  }
});

// Compound index for URL deduplication queries. 
// Also covers queries filtering only on `originalUrl` because it is the prefix field of the index.
urlSchema.index({ originalUrl: 1, expiresAt: 1 });

const Url = mongoose.model('Url', urlSchema);
export default Url;
