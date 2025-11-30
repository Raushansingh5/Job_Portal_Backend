import mongoSanitize from "mongo-sanitize";
import xss from "xss";


const cleanValue = (v) => {
  if (typeof v === "string") return xss(v);
  return v;
};

const mutateObject = (obj) => {
  if (!obj || typeof obj !== "object") return;

  for (const key of Object.keys(obj)) {
    const value = obj[key];

    if (key.startsWith("$")) {
      delete obj[key];
      continue;
    }

    if (value && typeof value === "object") {
      mutateObject(value);
    } else if (typeof value === "string") {
      obj[key] = cleanValue(value);
    } else {
      
      obj[key] = value;
    }
  }
};

export const sanitizeRequest = (req, res, next) => {
  if (req.body) mongoSanitize(req.body);
  if (req.query) mongoSanitize(req.query);
  if (req.params) mongoSanitize(req.params);

  if (req.body) mutateObject(req.body);
  if (req.query) mutateObject(req.query);
  if (req.params) mutateObject(req.params);

  next();
};
