// HttpError lets any handler stop a request with a status code:
//   throw new HttpError(404, 'Project not found')
// The error handler in app.js turns it into a JSON response.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Shorthand for the most common error: "<thing> not found".
export function notFound(thing) {
  return new HttpError(404, `${thing} not found`);
}
