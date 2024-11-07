import axios from 'axios';
import browserSync from 'browser-sync';
import crypto from 'crypto';
import express from 'express';
import OAuth from 'oauth-1.0a';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateBlueprint } from './blueprint-server.js';
import { secrets } from './secrets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isDev = process.env.NODE_ENV === 'development';
const THEME_GARDEN_ENDPOINT = 'https://www.tumblr.com/api/v2/theme_garden';

app.use(express.json({ limit: '50mb' }));

// Tumblr OAuth setup
const oauth = OAuth({
   consumer: secrets.consumer,
   signature_method: 'HMAC-SHA1',
   hash_function(base_string, key) {
      return crypto.createHmac('sha1', key).update(base_string).digest('base64');
   },
});

let requestToken = '';
let requestTokenSecret = '';

app.get('/auth/tumblr', async (req, res) => {
   const request_data = {
      url: 'https://www.tumblr.com/oauth/request_token',
      method: 'POST',
   };

   try {
      const headers = oauth.toHeader(oauth.authorize(request_data));
      const response = await axios.post(request_data.url, {}, { headers });

      const tokenData = new URLSearchParams(response.data);
      requestToken = tokenData.get('oauth_token');
      requestTokenSecret = tokenData.get('oauth_token_secret');

      console.log('Request Token:', requestToken);
      console.log('Request Token Secret:', requestTokenSecret);

      res.redirect(`https://www.tumblr.com/oauth/authorize?oauth_token=${requestToken}`);
   } catch (error) {
      console.error('Error:', error);
      res.send('Failed to get request token.');
   }
});

app.get('/callback', async (req, res) => {
   const { oauth_token, oauth_verifier } = req.query;

   console.log('oauth_token:', oauth_token);
   console.log('oauth_verifier:', oauth_verifier);

   if (!oauth_token || !oauth_verifier) {
      return res.send('Missing oauth_token or oauth_verifier');
   }

   const request_data = {
      url: 'https://www.tumblr.com/oauth/access_token',
      method: 'POST',
   };

   const token = {
      key: oauth_token,
      secret: requestTokenSecret,
   };

   try {
      const headers = oauth.toHeader(oauth.authorize({
         url: request_data.url,
         method: 'POST',
         data: { oauth_verifier },
      }, token));

      const response = await axios.post(request_data.url, {}, {
         headers: {
            ...headers,
            'Content-Type': 'application/x-www-form-urlencoded',
         },
         params: {
            oauth_verifier,
         }
      });

      console.log('Access Token Response:', response.data);
      res.send(`Access token response: ${response.data}`);
   } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
      res.send('Failed to get access token.');
   }
});

app.get('/custom-theme', async (req, res) => {
   console.log('Custom theme request');
   const blogIdentifier = req.query.blog;

   if (!blogIdentifier) {
      return res.status(400).json({ error: 'Blog identifier is required' });
   }

   const request_data = {
      url: `https://aaronjbap.dca.tumblr.net/v2/blog/${blogIdentifier}/custom_theme`,
      method: 'GET',
   };

   const token = secrets.access;

   const headers = oauth.toHeader(oauth.authorize(request_data, token));

   try {
      const response = await axios.get(request_data.url, {
         headers: {
            ...headers,
            'Content-Type': 'application/json',
         },
      });

      console.log('Custom theme data:', response.data);

      res.json(response.data);
   } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
      res.status(500).json({
         error: 'Failed to fetch custom theme',
         details: error.response ? error.response.data : error.message
      });
   }
});

app.get('/info', async (req, res) => {
   const blogIdentifier = req.query.blog;

   if (!blogIdentifier) {
      return res.status(400).json({ error: 'Blog identifier is required' });
   }

   const request_data = {
      url: `https://api.tumblr.com/v2/blog/${blogIdentifier}/info`,
      method: 'GET',
   };

   const token = secrets.access;

   const headers = oauth.toHeader(oauth.authorize(request_data, token));

   try {
      const response = await axios.get(request_data.url, {
         headers: {
            ...headers,
            'Content-Type': 'application/json',
         },
      });

      console.log('Response data:', response.data.response);

      res.json(response.data.response);
   } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
      res.status(500).json({
         error: 'Failed to fetch blog info',
         details: error.response ? error.response.data : error.message
      });
   }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
   res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.json());

app.post('/blueprint', (req, res) => {
   const { blogData, theme, themeHtml, defaultParams } = req.body;
   const blueprint = generateBlueprint(
      secrets.consumer,
      blogData,
      themeHtml,
      defaultParams
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
         isOfficial: theme.title === 'Tumblr Official'
      }));

      res.json(formattedThemes);
   } catch (error) {
      console.error('Error fetching themes:', error);
      res.status(500).json({
         error: 'Failed to fetch themes',
         details: error.response ? error.response.data : error.message
      });
   }
});

app.get('/theme/:themeId', async (req, res) => {
   try {
      const response = await axios.get(`${THEME_GARDEN_ENDPOINT}/theme/${req.params.themeId}?time=${Date.now()}`);
      const themeData = response.data.response;

      if (!themeData.theme) {
         return res.status(404).json({ error: 'Theme not found' });
      }

      res.json({
         theme: themeData.theme,
         defaultParams: themeData.default_params,
         title: themeData.title,
         thumbnail: themeData.thumbnail,
         author: themeData.author
      });
   } catch (error) {
      console.error('Error fetching theme:', error);
      res.status(500).json({
         error: 'Failed to fetch theme',
         details: error.response ? error.response.data : error.message
      });
   }
});

async function searchThemes(event) {
   const searchTerm = event.target.value.trim();
   const themeSelect = document.getElementById('themeSelect');

   if (searchTerm.length === 0) {
      // If search term is empty, repopulate with default themes
      return populateThemeDropdown();
   }

   try {
      const response = await fetch(`/themes?search=${encodeURIComponent(searchTerm)}`);
      const themes = await response.json();

      themeSelect.innerHTML = '';

      themes.forEach(theme => {
         const option = document.createElement('option');
         option.value = theme.id;
         option.textContent = theme.title;
         themeSelect.appendChild(option);
      });

      if (themeSelect.options.length > 0) {
         themeSelect.options[0].selected = true;
      }
   } catch (error) {
      console.error('Error searching themes:', error);
      const errorOption = document.createElement('option');
      errorOption.value = "";
      errorOption.textContent = "Error searching themes";
      themeSelect.innerHTML = '';
      themeSelect.appendChild(errorOption);
   }
}

const PORT = 3000;
const server = app.listen(PORT, () => {
   console.log(`App is running on http://localhost:${PORT}`);

   // Initialize Browser-Sync in development
   if (isDev) {
      browserSync.create().init({
         proxy: `localhost:${PORT}`,
         port: 3001,
         files: [
            'public/*.html',
            'public/*.css',
            'public/*.js',
            'public/**/*.css',
            'public/**/*.js'
         ],
         open: false,
         notify: false,
         ui: false,
         reloadDelay: 500,
         reloadDebounce: 500,
         ignore: ['node_modules'],
         watchEvents: ['change', 'add']
      }, function (err, bs) {
         if (err) console.log('BrowserSync error:', err);
         console.log('BrowserSync connected');
      });
   }
});
