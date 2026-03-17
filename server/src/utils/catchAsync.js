/**
 * Utility function to catch async errors in Express route handlers
 * Eliminates the need for try/catch blocks in controllers
 * @param {Function} fn - The async function to wrap
 * @returns {Function} - Express middleware function that catches errors
 */
module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
