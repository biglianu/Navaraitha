const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.get('/', (req, res) => {
  const { listing_id } = req.query;

  if (!listing_id) {
    return res.status(400).json({ success: false, error: 'listing_id is required' });
  }

  const dir = path.join(__dirname, '../../app_media', listing_id);

  if (!fs.existsSync(dir)) {
    return res.status(404).json({ success: false, error: 'Listing media not found' });
  }

  try {
    const files = fs.readdirSync(dir);
    const images = files.map(file => `/app_media/${listing_id}/${file}`);
    
    res.json({ success: true, images });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to read directory' });
  }
});

module.exports = router;
