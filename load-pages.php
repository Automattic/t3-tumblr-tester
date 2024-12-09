<?php
/**
 * Load Tumblr pages using the Tumblr API v2 and convert them to WordPress pages.
 *
 * @package T3 Tumblr Tester
 * @since 1.0.0
 */

require_once '/wordpress/wp-load.php';

// Global vars from JS
global $pages;

try {

	if ( isset( $pages['pages'] ) && is_array( $pages['pages'] ) ) {
		foreach ( $pages['pages'] as $tumblr_page ) {
			// Create WordPress page array
			$wp_page = array(
				'post_title'    => sanitize_text_field( $tumblr_page['title'] ),
				'post_content'  => wp_kses_post( $tumblr_page['content'] ),
				'post_status'   => $tumblr_page['show_link'] ? 'publish' : 'draft',
				'post_type'     => 'page',
				'post_author'   => 1,
				'menu_order'    => isset( $tumblr_page['position'] ) ? intval( $tumblr_page['position'] ) : 0,
				'post_date'     => gmdate( 'Y-m-d H:i:s', $tumblr_page['updated_at'] ),
				'post_modified' => gmdate( 'Y-m-d H:i:s', $tumblr_page['updated_at'] ),
			);

			// Set page path/slug
			if ( ! empty( $tumblr_page['path'] ) ) {
				$wp_page['post_name'] = sanitize_title( $tumblr_page['path'] );
			}

			$result = wp_insert_post( $wp_page, true );

			if ( is_wp_error( $result ) ) {
				error_log( 'Error creating page: ' . $result->get_error_message() );
			}
		}
	}
} catch ( Exception $e ) {
	error_log( 'Error: ' . $e->getMessage() );
}
