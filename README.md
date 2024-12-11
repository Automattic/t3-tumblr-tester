A testing tool for importing Tumblr blogs into Wordpress.

![Screenshot](screenshot.png)

See [todo.md](todo.md) for future plans.

## API Key Setup:

1. Run `cp secrets.template.js secrets.js`
1. Go to https://www.tumblr.com/oauth/apps
2. Click Register Application and enter the following:
3. Name: T3 Test Tool
4. Application Description: Testing tool for importing Tumblr blogs into Wordpress
5. Application Website: http://localhost:3000
6. Default Callback URL: http://localhost:3000/callback
7. Click Register Application
8. Copy the oAuth Consumer Key and Secret to secrets.js consumer section

## oAuth Setup:

You most likely do not need to setup oAuth, the API Key is enough for most cases. oAuth is currently used for fetching a blogs custom theme, however that also requires connecting to a devbox as the custom-theme endpoint is restricted to devbox's only (this will likely change). Adding instructions here in case you need it.

1. Start the server (see Running section)
2. Go to http://localhost:3000/auth/tumblr
3. Accept the permissions
4. Copy the oAuth Access Token and Secret to secrets.js access section
5. Restart the server

## Running

```
yarn install
yarn start

// or run in dev mode for browsersync and hot reloading
yarn dev
```

## View posts in legacy

Comment out `$full_url .= '&npf=true';` in load_posts.php
