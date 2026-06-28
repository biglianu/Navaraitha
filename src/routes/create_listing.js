const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { connectDB } = require('../lib/db');
const { validateListing } = require('../lib/validation');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!req.listingId) req.listingId = uuidv4();
    const dir = path.join(__dirname, '../../app_media', req.listingId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const idx = req.fileCount || 0;
    req.fileCount = idx + 1;
    cb(null, `image-${idx}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

router.post('/', upload.array('images', 10), validateListing, async (req, res, next) => {
  const mediaDir = path.join(__dirname, '../../app_media', req.listingId);
  try {
    const db = await connectDB();
    const { 
      category, 
      sub_category, 
      heading, 
      description, 
      history, 
      cost, 
      available_date_ranges, 
      owner 
    } = req.body;

    const doc = {
      listing_id: req.listingId,
      category,
      sub_category,
      heading,
      description,
      history: history || "",
      cost: parseFloat(cost),
      available_date_ranges: available_date_ranges.map(r => ({
        start: new Date(r.start),
        end: new Date(r.end)
      })),
      owner,
      image_count: req.files ? req.files.length : 0,
      media_path: `/app_media/${req.listingId}`,
      created_at: new Date()
    };

    await db.collection('listings').insertOne(doc);
    res.status(201).json({ success: true, listing_id: req.listingId });
  } catch (err) {
    if (req.listingId && fs.existsSync(mediaDir)) {
      fs.rmSync(mediaDir, { recursive: true, force: true });
    }
    next(err);
  }
});

module.exports = router;
