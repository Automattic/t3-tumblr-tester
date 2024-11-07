
Bugs:
Sometimes it does not load when switching theme

Playwright:
- Goes to tumblr test blog which includes test content
- Sets custom theme to predefined theme HTML - stored locally
- Takes screenshot
- Spawns playground, setting it to the same theme, using that tumblr blog for content
- Takes screenshot and compares
- Produces test results

Issues:
The Tumblr API does not have all data, we cannot completetly hydrate WP from it.

Future:
Could use redvelvet converter rather than rendering as legacy
Could use Tumblr Importer plugin instead of custom import for post content