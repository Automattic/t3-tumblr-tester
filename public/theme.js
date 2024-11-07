let currentBlogId = 'staff'; // Default value
let currentBlogData = {};

async function fetchThemeData(blogId) {
   try {
      const response = await fetch(`/info?blog=${blogId}`);
      const data = await response.json();

      console.log('Data:', data);

      currentBlogData = data.blog;
      currentBlogId = blogId;

      // Initialize playground with the fetched theme
      initPlayground();
   } catch (error) {
      console.error(`Error fetching theme for ${blogId}:`, error);
      // Initialize playground anyway with default values
      initPlayground();
   }
}

function fetchInitialTheme() {
   return fetchThemeData(currentBlogId);
}

async function fetchCustomTheme(event) {
   event.preventDefault();
   const blogId = document.getElementById('blogIdentifier').value;
   return fetchThemeData(blogId);
}

async function populateThemeDropdown() {
   try {
      const response = await fetch('/themes');
      const themes = await response.json();

      const themeSelect = document.getElementById('themeSelect');
      themeSelect.innerHTML = '';

      // Find the official theme
      const officialTheme = themes.find(theme => theme.title === 'Tumblr Official');

      themes.forEach(theme => {
         const option = document.createElement('option');
         option.value = theme.id;
         option.textContent = theme.title;
         // Select the official theme by default
         if (theme.title === 'Tumblr Official') {
            option.selected = true;
         }
         themeSelect.appendChild(option);
      });

      // If no official theme was found, select the first option
      if (!officialTheme && themeSelect.options.length > 0) {
         themeSelect.options[0].selected = true;
      }
   } catch (error) {
      console.error('Error loading themes:', error);
      const errorOption = document.createElement('option');
      errorOption.value = "";
      errorOption.textContent = "Error loading themes";
      themeSelect.innerHTML = '';
      themeSelect.appendChild(errorOption);
   }
}

function handleSearchKeyPress(event) {
   if (event.key === 'Enter') {
      event.preventDefault();
      searchThemes(event);
   }
}

async function searchThemes(event) {
   const searchTerm = event.target.value.trim();
   const themeSelect = document.getElementById('themeSelect');

   if (searchTerm.length === 0) {
      return populateThemeDropdown();
   }

   try {
      const response = await fetch(`/themes?search=${encodeURIComponent(searchTerm)}`);
      const themes = await response.json();

      themeSelect.innerHTML = ''; // Clear existing options

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

// Call fetchInitialTheme instead of initPlayground directly
populateThemeDropdown();
fetchInitialTheme();