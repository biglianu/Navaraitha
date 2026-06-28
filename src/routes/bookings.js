const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { connectDB, pgPool: pool } = require('../lib/db');

// Table creation moved to main initialization if needed, or kept here as a function
async function initBookingTable() {
  const schema = `
    CREATE TABLE IF NOT EXISTS booking (
      book_id SERIAL PRIMARY KEY,
      heading VARCHAR(255),
      image TEXT,
      owner_name VARCHAR(50) NOT NULL,
      customer_name VARCHAR(50) NOT NULL,
      cost DECIMAL(10, 2) NOT NULL,
      start_date TIMESTAMP WITH TIME ZONE NOT NULL,
      end_date TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`;
  try {
    await pool.query(schema);
  } catch (err) {
    console.error(`Bookings Table Error:`, err.message || err);
  }
}
initBookingTable();

router.post('/', async (req, res) => {
  const { owner_name, customer_name, cost, start_date, end_date, listing_id, heading, image } = req.body;
  
  if (owner_name === undefined || !customer_name || cost === undefined || cost === null || !start_date || !end_date || !listing_id) {
    return res.status(400).json({ success: false, error: "Missing fields" });
  }

  try {
    const db = await connectDB();
    
    const result = await pool.query(
      'INSERT INTO booking (owner_name, customer_name, cost, start_date, end_date, heading, image) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [owner_name, customer_name, cost, start_date, end_date, heading || null, image || null]
    );

    await db.collection('listings').deleteOne({ listing_id });

    const mediaDir = path.join(__dirname, '../../app_media', listing_id);
    if (fs.existsSync(mediaDir)) {
      fs.rmSync(mediaDir, { recursive: true, force: true });
    }

    res.status(201).json({ success: true, booking: result.rows[0] });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(400).json({ success: false, error: "Booking failed: " + err.message });
  }
});

router.get('/:username', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM booking WHERE owner_name = $1 OR customer_name = $1 ORDER BY created_at DESC',
      [req.params.username]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
