import axios from 'axios';
import browserSync from 'browser-sync';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateBlueprint } from './blueprint-server.js';
import { secrets } from './secrets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isDev = process.env.NODE_ENV === 'development';
const THEME_GARDEN_ENDPOINT = 'https://www.tumblr.com/api/v2/theme_garden';
const TUMBLR_OAUTH_AUTHORIZE = 'https://www.tumblr.com/oauth2/authorize';
const TUMBLR_OAUTH_TOKEN = 'https://api.tumblr.com/v2/oauth2/token';
const req_state = Math.random().toString(36).substring(7);

app.use(express.json({ limit: '50mb' }));

// OAuth2 routes
app.get('/auth/tumblr', (req, res) => {
	const authUrl = new URL(TUMBLR_OAUTH_AUTHORIZE);

	authUrl.searchParams.append('client_id', secrets.consumer.key);
	authUrl.searchParams.append('response_type', 'code');
	authUrl.searchParams.append('scope', 'write offline_access');
	authUrl.searchParams.append('redirect_uri', 'http://localhost:3000/callback');
	authUrl.searchParams.append('state', req_state);

	res.redirect(authUrl.toString());
});

app.get('/callback', async (req, res) => {
	const { code, state, error } = req.query;

	if (error) {
		return res.status(400).send(`Authorization error: ${error}`);
	}

	if (!code) {
		return res.status(400).send('Missing authorization code');
	}

	console.log(state, req_state, req, res);

	if (state != req_state) {
		return res.status(400).send('State mismatch');
	}

	try {
		const tokenResponse = await axios.post(
			TUMBLR_OAUTH_TOKEN,
			{
				grant_type: 'authorization_code',
				code,
				client_id: secrets.consumer.key,
				client_secret: secrets.consumer.secret,
				redirect_uri: 'http://localhost:3000/callback',
			},
			{
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);

		const { access_token, refresh_token, expires_in } = tokenResponse.data;

		// Store tokens securely - this is just an example
		console.log('Access Token:', access_token);
		console.log('Refresh Token:', refresh_token);
		console.log('Expires in:', expires_in);

		res.send('Authorization successful!');
	} catch (error) {
		console.error('Token Error:', error.response?.data || error.message);
		res.status(500).send('Failed to get access token');
	}
});

// API routes using OAuth2
app.get('/custom-theme', async (req, res) => {
	const blogIdentifier = req.query.blog;

	if (!blogIdentifier) {
		return res.status(400).json({ error: 'Blog identifier is required' });
	}

	try {
		const response = await axios.get(
			`https://api.tumblr.com/v2/blog/${blogIdentifier}/custom_theme`,
			{
				headers: {
					Authorization: `Bearer ${secrets.access_token}`,
					'Content-Type': 'application/json',
				},
			}
		);

		res.json(response.data);
	} catch (error) {
		console.error('Error:', error.response?.data || error.message);
		res.status(500).json({
			error: 'Failed to fetch custom theme',
			details: error.response?.data || error.message,
		});
	}
});

app.get('/info', async (req, res) => {
	const blogIdentifier = req.query.blog;

	if (!blogIdentifier) {
		return res.status(400).json({ error: 'Blog identifier is required' });
	}

	try {
		const response = await axios.get(`https://api.tumblr.com/v2/blog/${blogIdentifier}/info`, {
			headers: {
				Authorization: `Bearer ${secrets.access_token}`,
				'Content-Type': 'application/json',
			},
		});

		res.json(response.data.response);
	} catch (error) {
		console.error('Error:', error.response?.data || error.message);
		res.status(500).json({
			error: 'Failed to fetch blog info',
			details: error.response?.data || error.message,
		});
	}
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.json());

app.post('/blueprint', (req, res) => {
	const { blogData, theme, themeHtml, defaultParams, pages } = req.body;
	const blueprint = generateBlueprint(
		{
			key: secrets.consumer.key,
			secret: secrets.consumer.secret,
			access_token: secrets.access_token,
		},
		blogData,
		themeHtml,
		defaultParams,
		pages
	);
	res.json(blueprint);
});

app.get('/themes', async (req, res) => {
	const searchTerm = req.query.search || '';
	const url = searchTerm
		? `${THEME_GARDEN_ENDPOINT}?search=${encodeURIComponent(searchTerm)}`
		: THEME_GARDEN_ENDPOINT;

	try {
		const response = await axios.get(url);
		const themes = response.data.response.themes;

		const formattedThemes = themes.map(theme => ({
			id: theme.id,
			title: theme.title,
			isOfficial: theme.title === 'Tumblr Official',
		}));

		res.json(formattedThemes);
	} catch (error) {
		console.error('Error fetching themes:', error);
		res.status(500).json({
			error: 'Failed to fetch themes',
			details: error.response ? error.response.data : error.message,
		});
	}
});

app.get('/theme/:themeId', async (req, res) => {
	try {
		const response = await axios.get(
			`${THEME_GARDEN_ENDPOINT}/theme/${req.params.themeId}?time=${Date.now()}`
		);
		const themeData = response.data.response;

		if (!themeData.theme) {
			return res.status(404).json({ error: 'Theme not found' });
		}

		res.json({
			theme: themeData.theme,
			defaultParams: themeData.default_params,
			title: themeData.title,
			thumbnail: themeData.thumbnail,
			author: themeData.author,
		});
	} catch (error) {
		console.error('Error fetching theme:', error);
		res.status(500).json({
			error: 'Failed to fetch theme',
			details: error.response ? error.response.data : error.message,
		});
	}
});

app.get('/pages', async (req, res) => {
	const blogIdentifier = req.query.blog;

	if (!blogIdentifier) {
		return res.status(400).json({ error: 'Blog identifier is required' });
	}

	try {
		const response = await axios.get(`https://api.tumblr.com/v2/blog/${blogIdentifier}/pages`, {
			headers: {
				Authorization: `Bearer ${secrets.access_token}`,
				'Content-Type': 'application/json',
			},
		});

		res.json(response.data.response);
	} catch (error) {
		console.error('Error:', error.response?.data || error.message);
		res.status(500).json({
			error: 'Failed to fetch pages',
			details: error.response?.data || error.message,
		});
	}
});

const PORT = 3000;
const server = app.listen(PORT, () => {
	console.log(`App is running on http://localhost:${PORT}`);

	// Initialize Browser-Sync in development
	if (isDev) {
		browserSync.create().init(
			{
				proxy: `localhost:${PORT}`,
				port: 3001,
				files: [
					'public/*.html',
					'public/*.css',
					'public/*.js',
					'public/**/*.css',
					'public/**/*.js',
				],
				open: false,
				notify: false,
				ui: false,
				reloadDelay: 500,
				reloadDebounce: 500,
				ignore: ['node_modules'],
				watchEvents: ['change', 'add'],
			},
			function (err, bs) {
				if (err) console.log('BrowserSync error:', err);
				console.log('BrowserSync connected');
			}
		);
	}
});
