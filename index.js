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

// Step 1: Request Token Route
app.get('/auth/tumblr', async (req, res) => {
   const request_data = {
      url: 'https://www.tumblr.com/oauth/request_token',
      method: 'POST',
   };

   try {
      const headers = oauth.toHeader(oauth.authorize(request_data));
      const response = await axios.post(request_data.url, {}, { headers });

      // Parse the response
      const tokenData = new URLSearchParams(response.data);
      requestToken = tokenData.get('oauth_token');
      requestTokenSecret = tokenData.get('oauth_token_secret');

      console.log('Request Token:', requestToken);
      console.log('Request Token Secret:', requestTokenSecret);

      // Step 2: Redirect the user to Tumblr's authorization page
      res.redirect(`https://www.tumblr.com/oauth/authorize?oauth_token=${requestToken}`);
   } catch (error) {
      console.error('Error:', error);
      res.send('Failed to get request token.');
   }
});

// Step 3: Callback URL Route (after user authorizes the app)
app.get('/callback', async (req, res) => {
   const { oauth_token, oauth_verifier } = req.query;

   console.log('oauth_token:', oauth_token);
   console.log('oauth_verifier:', oauth_verifier);

   if (!oauth_token || !oauth_verifier) {
      return res.send('Missing oauth_token or oauth_verifier');
   }

   // Step 4: Exchange Request Token for Access Token
   const request_data = {
      url: 'https://www.tumblr.com/oauth/access_token',
      method: 'POST',
   };

   const token = {
      key: oauth_token, // The token returned by Tumblr
      secret: requestTokenSecret, // The secret from step 1
   };

   try {
      // Generate the signature using the oauth_verifier
      const headers = oauth.toHeader(oauth.authorize({
         url: request_data.url,
         method: 'POST',
         data: { oauth_verifier }, // Pass oauth_verifier here for signing
      }, token));

      // Make the request to exchange the Request Token and Verifier for an Access Token
      const response = await axios.post(request_data.url, {}, {
         headers: {
            ...headers,
            'Content-Type': 'application/x-www-form-urlencoded',
         },
         params: {
            oauth_verifier, // Include oauth_verifier here as well
         }
      });

      // Log the access token response
      console.log('Access Token Response:', response.data);
      res.send(`Access token response: ${response.data}`);
   } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
      res.send('Failed to get access token.');
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

      // Add header image to logging
      console.log('Theme data:', response.data.response.blog.theme);
      console.log('Avatar:', response.data.response.blog.avatar);
      console.log('Description:', response.data.response.blog.description);
      console.log('Background color:', response.data.response.blog.theme.background_color);
      console.log('Link color:', response.data.response.blog.theme.link_color);
      console.log('Title color:', response.data.response.blog.theme.title_color);
      console.log('Header image:', response.data.response.blog.theme.header_image);

      const themeData = {
         backgroundColor: response.data.response.blog.theme.background_color,
         linkColor: response.data.response.blog.theme.link_color,
         titleColor: response.data.response.blog.theme.title_color,
         headerImage: response.data.response.blog.theme.header_image,
         avatar: response.data.response.blog.avatar[3].url,
         blogDescription: response.data.response.blog.description,
      };

      res.json(themeData);
   } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
      res.status(500).json({
         error: 'Failed to fetch blog info',
         details: error.response ? error.response.data : error.message
      });
   }
});

// Add this near the top of the file, after creating the app
app.use(express.static(path.join(__dirname, 'public')));

// Modify the root route to serve the HTML file
app.get('/', (req, res) => {
   res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Add this after app.use(express.static...)
app.get('/test-css', (req, res) => {
   res.sendFile(path.join(__dirname, 'public', 'styles.css'));
});

// Add this new endpoint
app.get('/blueprint', (req, res) => {
   const { siteName, backgroundColor, avatar, linkColor, titleColor, headerImage, blogDescription } = req.query;
   const blueprint = generateBlueprint(secrets.consumer, siteName, backgroundColor, avatar, linkColor, titleColor, headerImage, blogDescription);
   res.json(blueprint);
});

// Modify the server startup
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
