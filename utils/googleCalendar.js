// utils/googleCalendar.js
const { google } = require("googleapis");
const User = require("../models/User");

const OAUTH_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

function createOauthClient() {
  return new google.auth.OAuth2(OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET);
}

async function ensureOAuthClientForUser(user) {
  const oauth2Client = createOauthClient();

  // set credentials from DB
  oauth2Client.setCredentials({
    access_token: user.google?.accessToken || null,
    refresh_token: user.google?.refreshToken || null,
    expiry_date: user.google?.expiryDate
      ? new Date(user.google.expiryDate).getTime()
      : null,
  });

  // refresh token if expired
  const expiry = user.google?.expiryDate
    ? new Date(user.google.expiryDate).getTime()
    : 0;
  const now = Date.now();

  if (user.google?.refreshToken && expiry && expiry - now < 60 * 1000) {
    try {
      const r = await oauth2Client.refreshToken(user.google.refreshToken);
      const tokens = r.credentials || r;
      oauth2Client.setCredentials(tokens);

      // persist refreshed token
      user.google.accessToken = tokens.access_token || user.google.accessToken;
      if (tokens.refresh_token) user.google.refreshToken = tokens.refresh_token;
      if (tokens.expiry_date)
        user.google.expiryDate = new Date(tokens.expiry_date);
      await user.save();
    } catch (err) {
      console.error("Failed to refresh Google token:", err?.message || err);
    }
  }

  return oauth2Client;
}

/**
 * Helper — build event start and end times in IST (Asia/Kolkata)
 */
function buildISTEventTimes(dateStr, timeStr = "08:00") {
  const [hh, mm] = timeStr.split(":");
  // Build explicit IST datetime with offset +05:30
  const localStart = new Date(
    `${dateStr}T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:00+05:30`
  );
  const localEnd = new Date(localStart.getTime() + 60 * 60 * 1000); // +1 hour
  return { localStart, localEnd };
}

/**
 * Create calendar event for a case.
 */
async function createEventForCase(userId, caseData) {
  try {
    const user = await User.findById(userId);
    if (!user?.google?.accessToken || !user.google.connected) return null;

    const oauth2Client = await ensureOAuthClientForUser(user);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const dateStr = caseData.hearing_details?.next_hearing_date;
    const timeStr = caseData.hearing_details?.time || "08:00"; // fallback to 8AM
    const { localStart, localEnd } = buildISTEventTimes(dateStr, timeStr);

    const event = {
      summary: `Hearing: ${caseData.case_title}`,
      description: `Client: ${
        caseData.client_info?.client_name || "-"
      }\nCourt: ${caseData.court_name || "-"}\nNotes: ${
        caseData.hearing_details?.note || "-"
      }`,
      start: { dateTime: localStart.toISOString(), timeZone: "Asia/Kolkata" },
      end: { dateTime: localEnd.toISOString(), timeZone: "Asia/Kolkata" },
    };

    const created = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });

    return created?.data?.id || null;
  } catch (err) {
    console.error("createEventForCase error:", err?.message || err);
    return null;
  }
}

/**
 * Update or create event for a case.
 */
async function upsertEventForCase(userId, caseData, existingEventId) {
  try {
    const user = await User.findById(userId);
    if (!user?.google?.accessToken || !user.google.connected) return null;

    const oauth2Client = await ensureOAuthClientForUser(user);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const dateStr = caseData.hearing_details?.next_hearing_date;
    const timeStr = caseData.hearing_details?.time || "08:00";
    const { localStart, localEnd } = buildISTEventTimes(dateStr, timeStr);

    const event = {
      summary: `Hearing: ${caseData.case_title}`,
      description: `Client: ${
        caseData.client_info?.client_name || "-"
      }\nCourt: ${caseData.court_name || "-"}\nNotes: ${
        caseData.hearing_details?.note || "-"
      }`,
      start: { dateTime: localStart.toISOString(), timeZone: "Asia/Kolkata" },
      end: { dateTime: localEnd.toISOString(), timeZone: "Asia/Kolkata" },
    };

    if (existingEventId) {
      try {
        const updated = await calendar.events.update({
          calendarId: "primary",
          eventId: existingEventId,
          resource: event,
        });
        return updated?.data?.id || existingEventId;
      } catch (err) {
        console.warn(
          "Update event failed, creating new event:",
          err?.message || err
        );
        const created = await calendar.events.insert({
          calendarId: "primary",
          resource: event,
        });
        return created?.data?.id || null;
      }
    } else {
      const created = await calendar.events.insert({
        calendarId: "primary",
        resource: event,
      });
      return created?.data?.id || null;
    }
  } catch (err) {
    console.error("upsertEventForCase error:", err?.message || err);
    return null;
  }
}

/**
 * Delete an event from the user's calendar.
 */
async function deleteEventForCase(userId, eventId) {
  try {
    if (!eventId) return;
    const user = await User.findById(userId);
    if (!user?.google?.accessToken || !user.google.connected) return;

    const oauth2Client = await ensureOAuthClientForUser(user);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    await calendar.events.delete({ calendarId: "primary", eventId });
    console.log("Deleted event", eventId);
  } catch (err) {
    console.error("deleteEventForCase error:", err?.message || err);
  }
}

module.exports = {
  createEventForCase,
  upsertEventForCase,
  deleteEventForCase,
};
