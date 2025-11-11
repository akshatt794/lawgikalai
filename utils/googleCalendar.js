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

  // If access token expired or near expiry, refresh
  const expiry = user.google?.expiryDate
    ? new Date(user.google.expiryDate).getTime()
    : 0;
  const now = Date.now();
  if (user.google?.refreshToken && expiry && expiry - now < 60 * 1000) {
    // refresh token
    try {
      const r = await oauth2Client.refreshToken(user.google.refreshToken);
      const tokens = r.credentials || r;
      oauth2Client.setCredentials(tokens);

      // persist new access token & expiry
      user.google.accessToken = tokens.access_token || user.google.accessToken;
      if (tokens.refresh_token) user.google.refreshToken = tokens.refresh_token;
      if (tokens.expiry_date)
        user.google.expiryDate = new Date(tokens.expiry_date);
      await user.save();
    } catch (err) {
      console.error("Failed to refresh Google token:", err?.message || err);
      // do not throw — caller will treat as not connected
    }
  }

  return oauth2Client;
}

/**
 * Create calendar event for a case. Returns created eventId or null.
 * caseData must contain: case_title, hearing_details.next_hearing_date, hearing_details.time, client_info.client_name, court_name
 */
async function createEventForCase(userId, caseData) {
  try {
    const user = await User.findById(userId);
    if (!user?.google?.accessToken || !user.google.connected) return null;

    const oauth2Client = await ensureOAuthClientForUser(user);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const start = new Date(caseData.hearing_details.next_hearing_date);
    // Use hearing_details.time if present (time part may be in separate field)
    if (caseData.hearing_details.time) {
      // if next_hearing_date has no time, combine with time (assumes 'HH:MM' string)
      // otherwise assume next_hearing_date already has time
      if (!/T/.test(caseData.hearing_details.next_hearing_date)) {
        const t = caseData.hearing_details.time;
        const [hh, mm] = (t || "").split(":");
        if (hh !== undefined) {
          start.setHours(Number(hh || 9), Number(mm || 0), 0, 0);
        }
      }
    }

    const end = new Date(start.getTime() + 60 * 60 * 1000); // default 1 hour

    const event = {
      summary: `Hearing: ${caseData.case_title}`,
      description: `Client: ${
        caseData.client_info?.client_name || "-"
      }\nCourt: ${caseData.court_name || "-"}\nNotes: ${
        caseData.hearing_details?.note || "-"
      }`,
      start: { dateTime: start.toISOString(), timeZone: "Asia/Kolkata" },
      end: { dateTime: end.toISOString(), timeZone: "Asia/Kolkata" },
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
 * Update event if eventId exists. If not exists, create new and return new id.
 * Expects caseData and existingEventId (may be null).
 */
async function upsertEventForCase(userId, caseData, existingEventId) {
  try {
    const user = await User.findById(userId);
    if (!user?.google?.accessToken || !user.google.connected) return null;

    const oauth2Client = await ensureOAuthClientForUser(user);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const start = new Date(caseData.hearing_details.next_hearing_date);
    if (
      caseData.hearing_details.time &&
      !/T/.test(caseData.hearing_details.next_hearing_date)
    ) {
      const [hh, mm] = (caseData.hearing_details.time || "").split(":");
      if (hh !== undefined)
        start.setHours(Number(hh || 9), Number(mm || 0), 0, 0);
    }
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const event = {
      summary: `Hearing: ${caseData.case_title}`,
      description: `Client: ${
        caseData.client_info?.client_name || "-"
      }\nCourt: ${caseData.court_name || "-"}\nNotes: ${
        caseData.hearing_details?.note || "-"
      }`,
      start: { dateTime: start.toISOString(), timeZone: "Asia/Kolkata" },
      end: { dateTime: end.toISOString(), timeZone: "Asia/Kolkata" },
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
        // if update failed (maybe event deleted), create new event
        console.warn(
          "update event failed, creating new event:",
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
