# Todo:
- Fetch redvelet php file in blueprint step instead of local copy
- Add option to switch between legacy and NPF
- Add url params to set default blog and theme

# Bugs:
- The Tumblr API does not have all data, we cannot completetly hydrate WP from it.

# Future:

## Playwright:
- Goes to tumblr test blog which includes test content
- Sets custom theme to predefined theme HTML - stored locally
- Takes screenshot
- Spawns playground, setting it to the same theme, using that tumblr blog for content
- Takes screenshot and compares
- Produces test results