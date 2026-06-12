import ClickLog from '../models/Analytics.js';
import { parseUserAgent, getGeoInfo } from './geoService.js';

/**
 * Asynchronously logs click metadata to prevent blocking client redirections.
 * Defer execution using setImmediate.
 */
export const recordClickAsync = (clickData) => {
  setImmediate(async () => {
    try {
      const { shortId, ip, userAgent, referrer } = clickData;
      const { device, browser } = parseUserAgent(userAgent);
      const { country, city } = await getGeoInfo(ip);

      await ClickLog.create({
        shortId,
        ip,
        userAgent: userAgent || 'Unknown',
        referrer: referrer || 'Direct',
        country,
        city,
        device,
        browser
      });
    } catch (error) {
      console.error(`[Analytics Error] Failed to log click for shortId ${clickData.shortId}:`, error.message);
    }
  });
};

/**
 * Aggregates and returns click statistics for a given shortId.
 * Utilizes a single MongoDB aggregation query with $facet for optimal performance.
 */
export const getAnalyticsSummary = async (shortId) => {
  const stats = await ClickLog.aggregate([
    { $match: { shortId } },
    {
      $facet: {
        totalClicks: [{ $count: "count" }],
        uniqueVisitors: [
          { $group: { _id: "$ip" } },
          { $count: "count" }
        ],
        devices: [
          { $group: { _id: "$device", count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        browsers: [
          { $group: { _id: "$browser", count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        countries: [
          { $group: { _id: "$country", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],
        cities: [
          { $group: { _id: "$city", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],
        referrers: [
          { $group: { _id: "$referrer", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]
      }
    }
  ]);

  const result = stats[0] || {};

  return {
    shortId,
    totalClicks: result.totalClicks?.[0]?.count || 0,
    uniqueClicks: result.uniqueVisitors?.[0]?.count || 0,
    devices: (result.devices || []).map(d => ({ device: d._id, count: d.count })),
    browsers: (result.browsers || []).map(b => ({ browser: b._id, count: b.count })),
    countries: (result.countries || []).map(c => ({ country: c._id, count: c.count })),
    cities: (result.cities || []).map(c => ({ city: c._id, count: c.count })),
    referrers: (result.referrers || []).map(r => ({ referrer: r._id, count: r.count }))
  };
};
