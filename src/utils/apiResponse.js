class ApiResponse {
  /**
   * @param {number} statusCode
   * @param {any} data
   * @param {string} message
   * @param {object} meta
   */
  constructor(statusCode, data = null, message = "success", meta = null) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
    this.meta = meta;
  }
}

export default ApiResponse;
