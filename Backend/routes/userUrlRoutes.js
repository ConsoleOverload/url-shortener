import { Router } from 'express';
import { 
  fetchUserUrls, 
  removeUrl, 
  updateAlias, 
  fetchUserUrlAnalytics 
} from '../controllers/userUrlController.js';

const router = Router();

// Retrieve all user URLs
router.get('/', fetchUserUrls);

// Delete a user's URL
router.delete('/:shortId', removeUrl);

// Update a custom alias for a user's URL
router.patch('/:shortId/alias', updateAlias);

// Fetch detailed analytics for a user's URL
router.get('/:shortId/analytics', fetchUserUrlAnalytics);

export default router;
