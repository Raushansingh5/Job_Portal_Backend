import nodemailer from "nodemailer";
import dns from "dns/promises";

let transporter = null;

function getEnv() {
  return {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: Number(process.env.SMTP_PORT || 587),
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    FROM_NAME: process.env.FROM_NAME || "App",
    FROM_EMAIL: process.env.FROM_EMAIL || "no-reply@example.com",
    SMTP_VERIFY: process.env.SMTP_VERIFY === "true" // optional verify logging
  };
}

async function resolveHostToIPv4(host) {
  try {
    const r = await dns.lookup(host, { family: 4 });
    if (r && r.address) return r.address;
  } catch (err) {
    // fallback to hostname if lookup fails
  }
  return host;
}

async function createTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_VERIFY } = getEnv();

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    const msg = `SMTP configuration missing. Check .env for SMTP_HOST, SMTP_USER, SMTP_PASS. Current: SMTP_HOST=${SMTP_HOST}, SMTP_USER=${!!SMTP_USER}`;
    console.error(msg);
    throw new Error(msg);
  }

  const hostResolved = await resolveHostToIPv4(SMTP_HOST);
  const port = Number(SMTP_PORT || 587);
  const secure = port === 465;

  transporter = nodemailer.createTransport({
    host: hostResolved,
    port,
    secure,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
    logger: SMTP_VERIFY,
    debug: SMTP_VERIFY,
  });

  // optional verification during startup
  if (SMTP_VERIFY) {
    transporter.verify((err, success) => {
      if (err) {
        console.error("SMTP verify failed:", err);
      } else {
        console.log("SMTP transporter verified and ready to send.");
      }
    });
  }

  return transporter;
}

/**
 * sendEmail({ to, subject, html, text })
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  const { FROM_NAME, FROM_EMAIL } = getEnv();
  const t = await createTransporter();
  try {
    return await t.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error("sendEmail error:", err);
    throw err;
  }
};

export default { sendEmail };
