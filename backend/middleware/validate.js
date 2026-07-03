const { validationResult } = require('express-validator');

/* Runs after express-validator check(...) chains; short-circuits with 422 on failure. */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, message: 'Validation failed.', errors: errors.array() });
  }
  next();
}

module.exports = validate;
