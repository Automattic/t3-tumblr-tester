async function getBlueprint(blogData) {
   const themeSelect = document.getElementById('themeSelect');
   const themeId = themeSelect.value;

   const themeResponse = await fetch(`/theme/${themeId}`);
   const themeData = await themeResponse.json();

   const response = await fetch(`/blueprint`, {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json'
      },
      body: JSON.stringify({
         blogData,
         theme: themeId,
         themeHtml: themeData.theme,
         defaultParams: themeData.defaultParams
      })
   });
   return await response.json();
}

window.initPlayground = async function () {
   try {
      const { startPlaygroundWeb } = await import('https://playground.wordpress.net/client/index.js');

      console.log('Initializing playground with blog data:', currentBlogData);

      const blueprintData = await getBlueprint(currentBlogData);

      const client = await startPlaygroundWeb({
         iframe: document.getElementById('wp'),
         remoteUrl: 'https://playground.wordpress.net/remote.html',
         blueprint: blueprintData,
      });

      await client.isReady();
   } catch (error) {
      console.error('Error initializing playground:', error);
   }
}