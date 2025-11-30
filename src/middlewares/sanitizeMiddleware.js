import mongoSanitize from "mongo-sanitize";
import xss from "xss";

/**
 * sanitizeMiddleware
 * - Runs mongo-sanitize to strip dangerous keys/operators.
 * - Recursively xss-sanitizes string values.
 * - Deletes keys that start with "$" to avoid operator injection and collisions.
 */

const cleanValue = (v) => {
  if (typeof v === "string") return xss(v);
  return v;
};

const mutateObject = (obj) => {
  if (!obj || typeof obj !== "object") return;

  for (const key of Object.keys(obj)) {
    const value = obj[key];

    // Remove keys starting with $ — safer than renaming (avoid collisions)
    if (key.startsWith("$")) {
      delete obj[key];
      continue;
    }

    if (value && typeof value === "object") {
      mutateObject(value);
    } else if (typeof value === "string") {
      obj[key] = cleanValue(value);
    } else {
      // keep numbers, booleans, null as-is
      obj[key] = value;
    }
  }
};

export const sanitizeRequest = (req, res, next) => {
  // mongo-sanitize MUTATES the given object – no need to reassign
  if (req.body) mongoSanitize(req.body);
  if (req.query) mongoSanitize(req.query);
  if (req.params) mongoSanitize(req.params);

  // Now recursively clean for XSS and $-keys
  if (req.body) mutateObject(req.body);
  if (req.query) mutateObject(req.query);
  if (req.params) mutateObject(req.params);

  next();
};
