const bcrypt = require('bcrypt');

const SALT_ROUNDS = parseInt(process.env.PASSWORD_SALT_ROUNDS || '10', 10);
const MIN_PASSWORD_LENGTH = parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10);

const validatePasswordStrength = (password) => {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must include uppercase, lowercase, and a number.' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\/]/.test(password)) {
    return { valid: false, message: 'Password must include at least one special character.' };
  }
  return { valid: true };
};

const hashPassword = async (password) => bcrypt.hash(password, SALT_ROUNDS);
const comparePassword = async (password, hash) => bcrypt.compare(password, hash);

module.exports = {
  validatePasswordStrength,
  hashPassword,
  comparePassword,
};
