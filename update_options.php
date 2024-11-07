<?php
require '/wordpress/wp-load.php';



// Define mapping between WordPress options and Tumblr data
$options_mapping = [
   'blogname' => ['name', ''],
   'blogdescription' => ['description', ''],
   'theme_mods' => [
      // Static mappings from blogData
      'background_color' => ['theme.background_color', '#FFFFFF'],
      'accent_color' => ['theme.link_color', '#0066cc'],
      'avatar_shape' => ['theme.avatar_shape', ''],
      'show_avatar' => ['theme.show_avatar', 'true'],
      'title_font' => ['theme.title_font', 'Arial'],
      'title_font_weight' => ['theme.title_font_weight', 'bold'],
      'header_textcolor' => ['theme.title_color', '#000000'],
      'header_image' => ['theme.header_image', ''],
      'stretch_header_image' => ['theme.header_stretch', ''],
      'custom_logo' => ['avatar.3.url', ''],
   ]
];

// Add dynamic mappings from defaultParams
if (is_string($defaultParams)) {
   $params = unserialize($defaultParams);
   if (is_array($params)) {
      foreach ($params as $key => $value) {
         // Skip the select_lists array and other non-theme related options
         if ($key !== 'select_lists' && !is_array($value)) {
            $normalized_key = tumblr3_normalize_option_name($key);
            $options_mapping['theme_mods'][$normalized_key] = [$key, $value];
         }
      }
   }
}

// Helper function to get nested value using dot notation
function get_nested_value($array, $path, $default = null)
{
   $keys = explode('.', $path);
   $current = $array;

   foreach ($keys as $key) {
      if (!isset($current[$key])) {
         return $default;
      }
      $current = $current[$key];
   }

   return $current;
}

// Switch theme
switch_theme('tumblr3');

// Store the original theme HTML
update_option('tumblr3_theme_html', $themeHtml);

// Update basic options
foreach ($options_mapping as $wp_option => $tumblr_data) {
   if ($wp_option !== 'theme_mods') {
      list($path, $default) = $tumblr_data;
      // Check defaultParams first, then fallback to blogData
      $value = get_nested_value($defaultParams, $path, null);
      if ($value === null) {
         $value = get_nested_value($blogData, $path, $default);
      }
      update_option($wp_option, $value);
   }
}

// Handle media upload for avatar
$avatar_url = get_nested_value($blogData, 'avatar.3.url', '');
if ($avatar_url) {
   require_once(ABSPATH . 'wp-admin/includes/media.php');
   require_once(ABSPATH . 'wp-admin/includes/file.php');
   require_once(ABSPATH . 'wp-admin/includes/image.php');

   // Download and upload the avatar
   $tmp = download_url($avatar_url);
   if (!is_wp_error($tmp)) {
      $file_array = array(
         'name' => basename($avatar_url),
         'tmp_name' => $tmp
      );
      $attachment_id = media_handle_sideload($file_array, 0);
   }
}

// Update theme mods
$theme_mods = array();
foreach ($options_mapping['theme_mods'] as $mod_name => $tumblr_data) {
   list($path, $default) = $tumblr_data;
   if ($mod_name === 'custom_logo' && isset($attachment_id) && !is_wp_error($attachment_id)) {
      $theme_mods[$mod_name] = $attachment_id;
   } else {
      // Check defaultParams first, then fallback to blogData
      $value = get_nested_value($defaultParams, $path, null);
      if ($value === null) {
         $value = get_nested_value($blogData, $path, $default);
      }
      $theme_mods[$mod_name] = $value;
   }
}
update_option('theme_mods_tumblr3', $theme_mods);
