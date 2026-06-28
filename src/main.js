const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { pgPool: pool } = require('./lib/db');
const categoriesRouter = require('./routes/categories');
const createListingRouter = require('./routes/create_listing');
const listingsRouter = require('./routes/listings');
const imagesRouter = require('./routes/images');
const usersRouter = require('./routes/users');
const bookingsRouter = require('./routes/bookings');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());

const clients = new Map();

wss.on('connection', (ws) => {
  let currentUser = null;

  ws.on('message', async (data) => {
    const payload = JSON.parse(data);

    if (payload.type === 'auth') {
      currentUser = payload.username;
      clients.set(currentUser, ws);
      return;
    }

    if (payload.type === 'message') {
      const { listing_id, sender, receiver, message } = payload;

      try {
        await pool.query(
          'INSERT INTO chat_messages (listing_id, sender, receiver, message) VALUES ($1, $2, $3, $4)',
          [listing_id, sender, receiver, message]
        );
      } catch (err) {
        console.error("DB Save Error:", err);
      }

      const receiverSocket = clients.get(receiver);
      if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
        receiverSocket.send(JSON.stringify({
          type: 'message',
          listing_id,
          sender,
          message,
          timestamp: new Date()
        }));
      }
    }
  });

  ws.on('close', () => {
    if (currentUser) clients.delete(currentUser);
  });
});


app.get('/api/chat/:listing_id/:user1/:user2', async (req, res) => {
  const { listing_id, user1, user2 } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM chat_messages 
             WHERE listing_id = $1 AND 
             ((sender = $2 AND receiver = $3) OR (sender = $3 AND receiver = $2)) 
             ORDER BY created_at ASC`,
      [listing_id, user1, user2]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/categories', categoriesRouter.getCategories);
app.use('/create_listing', createListingRouter);
app.use('/listings', listingsRouter);
app.use('/images', imagesRouter);
app.use('/users', usersRouter);
app.use('/bookings', bookingsRouter);

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ success: false, error: err.message });
});

app.listen(3000, '0.0.0.0');
