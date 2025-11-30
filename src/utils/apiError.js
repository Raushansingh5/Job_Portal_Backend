export default class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {boolean} exposeMessage - whether message should be sent to client
   * @param {object} meta - optional metadata (e.g. validation errors)
   */
  constructor(message, statusCode = 500, exposeMessage = true, meta = null) {
    super(message);

    this.statusCode = statusCode;
    this.exposeMessage = exposeMessage;
    this.meta = meta;

    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
