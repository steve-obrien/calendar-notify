// calendarNotifier.js

const fs = require('fs');
const http = require('http');
const url = require('url');
const destroyer = require('server-destroy');
const { google } = require('googleapis');
const schedule = require('node-schedule');
const { exec } = require('child_process');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const TOKEN_PATH = 'token.json';

// Set to keep track of scheduled events
const scheduledEventIds = new Set();

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
	if (err) return console.error('Error loading client secret file:', err);
	// Authorize a client with credentials, then call the Google Calendar API.
	authorize(JSON.parse(content), startNotifier);
});

function authorize(credentials, callback) {
	const { client_secret, client_id, redirect_uris } = credentials.installed;
	const redirectUri = redirect_uris[0];
	const oAuth2Client = new google.auth.OAuth2(
		client_id,
		client_secret,
		redirectUri
	);

	// Check if we have previously stored a token.
	fs.readFile(TOKEN_PATH, async (err, token) => {
		if (err) return getAccessToken(oAuth2Client, callback);
		oAuth2Client.setCredentials(JSON.parse(token));
		callback(oAuth2Client);
	});
}

function getAccessToken(oAuth2Client, callback) {
	const authUrl = oAuth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES,
	});
	console.log('Authorize this app by visiting this URL:', authUrl);

	// Automatically open the URL in the default browser
	exec(`open "${authUrl}"`);

	// Start a local server to receive the auth code
	const server = http
		.createServer(async (req, res) => {
			if (req.url.indexOf('/oauth2callback') > -1) {
				const qs = new url.URL(req.url, 'http://localhost:3000')
					.searchParams;
				res.end('Authentication successful! You can close this tab.');
				server.destroy();
				const code = qs.get('code');
				oAuth2Client.getToken(code, (err, token) => {
					if (err)
						return console.error('Error retrieving access token', err);
					oAuth2Client.setCredentials(token);
					// Store the token to disk for later program executions
					fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
						if (err) console.error('Error saving token:', err);
						else console.log('Token stored to', TOKEN_PATH);
					});
					callback(oAuth2Client);
				});
			}
		})
		.listen(3000, () => {
			console.log('Listening on port 3000 for OAuth2 callback');
		});
	destroyer(server);
}

function startNotifier(auth) {
	fetchAndScheduleEvents(auth); // Initial fetch and schedule
	// Fetch events every 10 minutes
	setInterval(() => {
		fetchAndScheduleEvents(auth);
	}, 10 * 60 * 1000); // 10 minutes in milliseconds
}

function fetchAndScheduleEvents(auth) {
	const calendar = google.calendar({ version: 'v3', auth });
	const now = new Date();
	const maxTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next 24 hours

	calendar.events.list(
		{
			calendarId: 'primary',
			timeMin: now.toISOString(),
			timeMax: maxTime.toISOString(),
			singleEvents: true,
			orderBy: 'startTime',
		},
		(err, res) => {
			if (err) return console.error('The API returned an error:', err);
			const events = res.data.items;
			if (events.length) {
				console.log('Upcoming events:');
				events.forEach((event) => {
					const start = event.start.dateTime || event.start.date;
					console.log(`${start} - ${event.summary}`);
					scheduleNotifications(event);
				});
			} else {
				console.log('No upcoming events found.');
			}
		}
	);
}

function scheduleNotifications(event) {
	const eventId = event.id;

	// Check if notifications for this event have already been scheduled
	if (scheduledEventIds.has(eventId)) {
		return; // Skip scheduling to avoid duplicates
	}

	scheduledEventIds.add(eventId);

	const eventStart = new Date(event.start.dateTime || event.start.date);
	const eventSummary = event.summary || 'No Title';

	const tenMinutesBefore = new Date(eventStart.getTime() - 10 * 60 * 1000);
	const twoMinutesBefore = new Date(eventStart.getTime() - 2 * 60 * 1000);

	if (tenMinutesBefore > new Date()) {
		schedule.scheduleJob(tenMinutesBefore, () => {
			announceEvent(`Upcoming event in 10 minutes: ${eventSummary}`);
		});
		console.log(`Scheduled 10-minute notification for "${eventSummary}"`);
	}

	if (twoMinutesBefore > new Date()) {
		schedule.scheduleJob(twoMinutesBefore, () => {
			announceEvent(`Upcoming event in 2 minutes: ${eventSummary}`);
		});
		console.log(`Scheduled 2-minute notification for "${eventSummary}"`);
	}
}

function announceEvent(message) {
	// Use the 'say' command on macOS to speak the message
	exec(`say "${message}"`);
}
