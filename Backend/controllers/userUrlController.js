import { getUserUrls, deleteUserUrl, updateUserUrlAlias } from '../services/urlService.js';
import { getAnalyticsSummary } from '../services/analyticsService.js';
import Url from '../models/Url.js';
import { AppError } from '../utils/errors.js';

/**
 * Controller to fetch all URLs owned by the authenticated user.
 */
export const fetchUserUrls = async (req, res, next) => {
  try {
    const urls = await getUserUrls(req.user.userId);
    
    // Add full short URL to each record
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.headers.host}`;
    const mappedUrls = urls.map(url => ({
      ...url,
      shortUrl: `${baseUrl}/${url.shortId}`
    }));

    res.status(200).json({
      success: true,
      data: mappedUrls
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to delete a URL owned by the authenticated user.
 */
export const removeUrl = async (req, res, next) => {
  try {
    const { shortId } = req.params;
    await deleteUserUrl(req.user.userId, shortId);

    res.status(200).json({
      success: true,
      message: 'Short URL deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to update custom alias for a URL owned by the authenticated user.
 */
export const updateAlias = async (req, res, next) => {
  try {
    const { shortId } = req.params;
    const { newAlias, newTitle } = req.body;

    if (!newAlias && newTitle === undefined) {
      throw new AppError('At least new alias or new title is required to update.', 400);
    }

    const updatedUrl = await updateUserUrlAlias(req.user.userId, shortId, { newAlias, newTitle });
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.headers.host}`;

    res.status(200).json({
      success: true,
      data: {
        shortId: updatedUrl.shortId,
        originalUrl: updatedUrl.originalUrl,
        shortUrl: `${baseUrl}/${updatedUrl.shortId}`,
        createdAt: updatedUrl.createdAt,
        expiresAt: updatedUrl.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch detailed analytics for a URL owned by the authenticated user.
 */
export const fetchUserUrlAnalytics = async (req, res, next) => {
  try {
    const { shortId } = req.params;

    // Verify ownership of the URL before showing analytics
    const urlExists = await Url.findOne({ shortId }).select('userId').lean();
    if (!urlExists) {
      throw new AppError('Short URL not found.', 404);
    }

    if (urlExists.userId && urlExists.userId.toString() !== req.user.userId) {
      throw new AppError('Access denied. You do not own this URL.', 403);
    }

    const summary = await getAnalyticsSummary(shortId);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};
