const { MongoClient } = require('mongodb');
const { Pool } = require('pg');

const pgPool = new Pool({
  user: 'root',
  host: 'postgres',
  database: 'postgres', 
  password: 'root',
  port: 5432,
});

const url = process.env.MONGO_URL || 'mongodb://app:app@localhost:27017/navaritha';
let db = null;

async function connectDB() {
  if (db) return db;
  const client = await MongoClient.connect(url);
  db = client.db();
  return db;
}

module.exports = { connectDB, pgPool };
