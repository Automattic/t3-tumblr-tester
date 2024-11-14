<?php
/**
 * Update WordPress options with Tumblr data.
 *
 * @package T3 Tumblr Tester
 */

require '/wordpress/wp-load.php';

// Global vars from JS.
global $default_params;
global $blog_data;
global $theme_html;

// Define mapping between WordPress options and Tumblr data
$options_mapping = array(
	'blogname'        => array( 'name', '' ),
	'blogdescription' => array( 'description', '' ),
	'theme_mods'      => array(
		// Static mappings from blogData
		'background_color'     => array( 'theme.background_color', '#FFFFFF' ),
		'accent_color'         => array( 'theme.link_color', '#0066cc' ),
		'avatar_shape'         => array( 'theme.avatar_shape', '' ),
		'show_avatar'          => array( 'theme.show_avatar', 'true' ),
		'title_font'           => array( 'theme.title_font', 'Arial' ),
		'title_font_weight'    => array( 'theme.title_font_weight', 'bold' ),
		'header_textcolor'     => array( 'theme.title_color', '#000000' ),
		'header_image'         => array( 'theme.header_image', '' ),
		'stretch_header_image' => array( 'theme.header_stretch', '' ),
		'custom_logo'          => array( 'avatar.3.url', '' ),
	),
);

// Add dynamic mappings from defaultParams
if ( is_string( $default_params ) ) {
	$params = maybe_unserialize( $default_params );
	if ( is_array( $params ) ) {
		foreach ( $params as $key => $value ) {
			// Skip the select_lists array and other non-theme related options
			if ( 'select_lists' !== $key && ! is_array( $value ) ) {
				$normalized_key                                   = tumblr3_normalize_option_name( $key );
				$options_mapping['theme_mods'][ $normalized_key ] = array( $key, $value );
			}
		}
	}
}

/**
 * Helper function to get nested value using dot notation
 *
 * @param array  $value
 * @param string $key
 * @param mixed  $default_params
 * @return string
 */
function get_nested_value( $value, $key, $default_params = null ) {
	$keys    = explode( '.', $key );
	$current = $value;

	foreach ( $keys as $key ) {
		if ( ! isset( $current[ $key ] ) ) {
			return $default_params;
		}
		$current = $current[ $key ];
	}

	return $current;
}

// Switch theme
switch_theme( 'tumblr3' );

// Store the original theme HTML
update_option( 'tumblr3_theme_html', $theme_html );

// Update basic options
foreach ( $options_mapping as $wp_option => $tumblr_data ) {
	if ( 'theme_mods' !== $wp_option ) {
		list($key, $default_params) = $tumblr_data;
		// Check defaultParams first, then fallback to blogData
		$value = get_nested_value( $default_params, $key, null );
		if ( null === $value ) {
			$value = get_nested_value( $blog_data, $key, $default_params );
		}
		update_option( $wp_option, $value );
	}
}

// Handle media upload for avatar
$avatar_url = get_nested_value( $blog_data, 'avatar.3.url', '' );
if ( $avatar_url ) {
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';

	// Download and upload the avatar
	$tmp = download_url( $avatar_url );
	if ( ! is_wp_error( $tmp ) ) {
		$file_array    = array(
			'name'     => basename( $avatar_url ),
			'tmp_name' => $tmp,
		);
		$attachment_id = media_handle_sideload( $file_array, 0 );
	}
}

// Update theme mods
$theme_mods = array();
foreach ( $options_mapping['theme_mods'] as $mod_name => $tumblr_data ) {
	list($key, $default_params) = $tumblr_data;
	if ( 'custom_logo' === $mod_name && isset( $attachment_id ) && ! is_wp_error( $attachment_id ) ) {
		$theme_mods[ $mod_name ] = $attachment_id;
	} else {
		// Check defaultParams first, then fallback to blogData
		$value = get_nested_value( $default_params, $key, null );
		if ( null === $value ) {
			$value = get_nested_value( $blog_data, $key, $default_params );
		}
		$theme_mods[ $mod_name ] = $value;
	}
}
update_option( 'theme_mods_tumblr3', $theme_mods );
