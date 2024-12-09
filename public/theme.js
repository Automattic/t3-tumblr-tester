let currentBlogId = 'staff'; // Default value
let currentBlogData = {};
let currentThemeId = null;

async function fetchThemeData(blogId) {
	try {
		const infoResponse = await fetch(`/info?blog=${blogId}`);
		const data = await infoResponse.json();

		console.log('Data:', data);

		currentBlogData = data.blog;
		currentBlogId = blogId;
		currentThemeId = data.blog.theme_id;

		console.log('Current theme ID:', currentThemeId);

		// Populate dropdown with the blog's theme selected
		await populateThemeDropdown(currentThemeId);

		// Initialize playground with the fetched theme
		initPlayground();
	} catch (error) {
		console.error(`Error fetching data for ${blogId}:`, error);
		// Initialize playground anyway with default values
		await populateThemeDropdown();
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

async function populateThemeDropdown(selectedThemeId = null) {
	try {
		const response = await fetch('/themes');
		const themes = await response.json();

		const themeSelect = document.getElementById('themeSelect');
		themeSelect.innerHTML = '';

		// If we have a selectedThemeId, fetch its details if it's not in the list
		if (selectedThemeId && !themes.find(theme => theme.id === selectedThemeId)) {
			try {
				const themeResponse = await fetch(`/theme/${selectedThemeId}`);
				const themeData = await themeResponse.json();
				themes.unshift({
					id: selectedThemeId,
					title: themeData.title || `Theme ${selectedThemeId}`,
					isCustom: true,
				});
			} catch (error) {
				console.error('Error fetching selected theme:', error);
			}
		}

		themes.forEach(theme => {
			const option = document.createElement('option');
			option.value = theme.id;
			option.textContent = theme.title;
			if (theme.id === selectedThemeId) {
				option.selected = true;
			}
			themeSelect.appendChild(option);
		});

		// If no theme was selected, select the first option
		if (!selectedThemeId && themeSelect.options.length > 0) {
			themeSelect.options[0].selected = true;
		}
	} catch (error) {
		console.error('Error loading themes:', error);
		const errorOption = document.createElement('option');
		errorOption.value = '';
		errorOption.textContent = 'Error loading themes';
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
		return populateThemeDropdown(currentThemeId);
	}

	try {
		const response = await fetch(`/themes?search=${encodeURIComponent(searchTerm)}`);
		const themes = await response.json();

		themeSelect.innerHTML = '';

		// If the current theme isn't in search results but exists, add it
		if (currentThemeId && !themes.find(theme => theme.id === currentThemeId)) {
			try {
				const themeResponse = await fetch(`/theme/${currentThemeId}`);
				const themeData = await themeResponse.json();
				themes.unshift({
					id: currentThemeId,
					title: themeData.title || `Theme ${currentThemeId}`,
					isCustom: true,
				});
			} catch (error) {
				console.error('Error fetching current theme:', error);
			}
		}

		themes.forEach(theme => {
			const option = document.createElement('option');
			option.value = theme.id;
			option.textContent = theme.title;
			if (theme.id === currentThemeId) {
				option.selected = true;
			}
			themeSelect.appendChild(option);
		});

		if (themeSelect.options.length > 0 && !themeSelect.value) {
			themeSelect.options[0].selected = true;
		}
	} catch (error) {
		console.error('Error searching themes:', error);
		const errorOption = document.createElement('option');
		errorOption.value = '';
		errorOption.textContent = 'Error searching themes';
		themeSelect.innerHTML = '';
		themeSelect.appendChild(errorOption);
	}
}

// Initialize with empty theme ID
populateThemeDropdown();
fetchInitialTheme();
