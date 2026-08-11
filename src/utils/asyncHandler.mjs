// Wraps an async route handler so rejected promises reach Express's error middleware.
export default (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
