import { google } from 'googleapis';
import env from './env.mjs';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

let calendarClient = null;

export function getCalendarClient() {
  if (calendarClient) return calendarClient;

  const auth = new google.auth.JWT({
    email: env.google.clientEmail,
    key: env.google.privateKey,
    scopes: SCOPES,
  });

  calendarClient = google.calendar({ version: 'v3', auth });
  return calendarClient;
}
