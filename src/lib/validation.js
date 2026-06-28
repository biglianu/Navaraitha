const Joi = require('joi');
const fs = require('fs');
const path = require('path');

const listingSchema = Joi.object({
  category: Joi.string().required(),
  sub_category: Joi.string().required(),
  heading: Joi.string().required(),
  description: Joi.string().required(),
  history: Joi.string().allow('').optional(),
  cost: Joi.number().required(),
  owner: Joi.string().required(),
  available_date_ranges: Joi.array().items(
    Joi.object({
      start: Joi.date().iso().required(),
      // Must be at least 1 hour (3,600,000 ms) after start
      end: Joi.date().iso().min(Joi.ref('start', {
        adjust: (value) => new Date(value.getTime() + 3600000)
      })).required()
    })
  )
  .unique((a, b) => a.start.getTime() === b.start.getTime() && a.end.getTime() === b.end.getTime())
  .required()
});

const validateListing = (req, res, next) => {
  if (req.body.available_date_ranges && typeof req.body.available_date_ranges === 'string') {
    try {
      req.body.available_date_ranges = JSON.parse(req.body.available_date_ranges);
    } catch (e) {
      return cleanupAndFail(req, res, 'Invalid JSON in date ranges');
    }
  }

  const { error } = listingSchema.validate(req.body);
  if (error) {
    const msg = error.details[0].message.includes('min') 
      ? 'Duration must be at least 1 hour' 
      : error.details[0].message;
    return cleanupAndFail(req, res, msg);
  }

  next();
};

function cleanupAndFail(req, res, message) {
  if (req.listingId) {
    const dir = path.join(__dirname, '../../app_media', req.listingId);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  }
  res.status(400).json({ success: false, error: message });
}

module.exports = { validateListing };
