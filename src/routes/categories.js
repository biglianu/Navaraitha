const { connectDB } = require('../lib/db');

const getCategories = async (req, res, next) => {
  try {
    const db = await connectDB();
    const doc = await db.collection('metadata').findOne({ type: "list_of_categories" });
    res.json(doc ? doc.body : []);
  } catch (err) {
    next(err);
  }
};

module.exports = { getCategories };
