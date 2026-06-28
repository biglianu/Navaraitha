const express = require('express');
const router = express.Router();
const { connectDB } = require('../lib/db');

router.get('/', async (req, res, next) => {
  try {
    const db = await connectDB();
    let { category, sub_category, start_date, end_date, n } = req.query;

    const limit = 10;
    const skip = parseInt(n) || 0;
    let filter = {};

    // Handles single or comma-separated strings
    if (category) {
      filter.category = { $in: category.split(',') };
    }

    if (sub_category) {
      filter.sub_category = { $in: sub_category.split(',') };
    }

    // Date Availability Logic
    if (start_date && end_date) {
      filter.available_date_ranges = {
        $elemMatch: {
          start: { $lte: new Date(start_date) },
          end: { $gte: new Date(end_date) }
        }
      };
    }

    const results = await db.collection('listings')
      .find(filter)
      .project({ _id: 0 }) 
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection('listings').countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: results,
      has_more: (skip + results.length) < total
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
