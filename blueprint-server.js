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

export const generateBlueprint = (consumer, blogData, themeHtml, defaultParams) => {
   return {
      "$schema": "https://playground.wordpress.net/blueprint-schema.json",
      "preferredVersions": {
         "php": "8.3",
         "wp": "latest"
      },
      "features": {
         "networking": true
      },
      "landingPage": "/",
      "login": true,
      "steps": [
         {
            "step": "mkdir",
            "path": "wordpress/wp-content/mu-plugins"
         },
         {
            "step": "writeFile",
            "path": "wordpress/wp-content/mu-plugins/addFilter-0.php",
            "data": "<?php add_action( 'requests-requests.before_request', function( &$url ) {\n$url = 'https://playground.wordpress.net/cors-proxy.php?' . $url;\n} );"
         },
         {
            "step": "installPlugin",
            "pluginData": {
               "resource": "url",
               "url": "https://github-proxy.com/proxy/?repo=Automattic/tumblr-theme-translator&release=v0.1.3&asset=tumblr-theme-translator.zip"
            }
         },
         {
            "step": "login",
            "username": "admin",
            "password": "password"
         },
         {
            "step": "setSiteOptions",
            "options": {
               "template": "tumblr3",
               "stylesheet": "tumblr3"
            }
         },
         {
            "step": "wp-cli",
            "command": `wp media import '${blogData.avatar?.[3]?.url}' --porcelain`
         },
         {
            "step": "runPHP",
            "code": `<?php
                $consumer = '${consumer.key}';
                $blog_data = json_decode('${JSON.stringify(blogData)}', true);
                $default_params = json_decode('${JSON.stringify(defaultParams)}', true);
                $theme_html = <<<'EOD'
${themeHtml}
EOD;
                require_once '/wordpress/wp-load.php';

                define('WP_DEBUG', true);
                define('WP_DEBUG_LOG', true);

                ${readFile('update-options.php')}
                ${readFile('clear-posts.php')}
                ${readFile('redvelet.php')}
                ${readFile('load-posts.php')}
            `
         },
      ]
   };
};