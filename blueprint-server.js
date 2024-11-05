import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFile = (filename) => {
   const filePath = path.join(__dirname, filename);
   const content = fs.readFileSync(filePath, 'utf8')
      .replace(/^<\?php\s+/, '')
      .replace(/^\s+/, '');
   return content;
};

export const generateBlueprint = (consumer, siteName, backgroundColor, avatar, linkColor, titleColor, headerImage, blogDescription) => ({
   "$schema": "https://playground.wordpress.net/blueprint-schema.json",
   "preferredVersions": {
      "php": "8.3",
      "wp": "6.6"
   },
   "features": {
      "networking": true
   },
   "landingPage": "/",
   "login": true,
   "steps": [
      {
         "step": "installPlugin",
         "pluginData": {
            "resource": "url",
            "url": "https://github-proxy.com/proxy/?repo=Automattic/tumblr-theme-translator&release=v0.1.1-alpha&asset=tumblr-theme-translator.zip"
         }
      },
      {
         "step": "login",
         "username": "admin",
         "password": "password"
      },
      {
         "step": "wp-cli",
         "command": `wp media import '${avatar}' --porcelain`
      },
      {
         "step": "runPHP",
         "code": `<?php
                $consumer = '${consumer.key}';
                $siteName = '${siteName}';
                $backgroundColor = '${backgroundColor}';
                $avatar = '${avatar}';
                $linkColor = '${linkColor}';
                $titleColor = '${titleColor}';
                $headerImage = '${headerImage}';
                $blogDescription = '${blogDescription}';

                require_once '/wordpress/wp-load.php';

                define('WP_DEBUG', true);
                define('WP_DEBUG_LOG', true);

                ${readFile('update_options.php')}
                ${readFile('clear_posts.php')}
                ${readFile('load_posts.php')}
            `
      },
      {
         "step": "setSiteOptions",
         "options": {
            "tumblr3_theme_html": `${readFile('vision.html')}`
         }
      },
   ]
});