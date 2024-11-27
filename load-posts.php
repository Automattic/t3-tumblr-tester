<?php
/**
 * Load Tumblr posts using the Tumblr API and convert them to WordPress posts.
 *
 * @package T3 Tumblr Tester
 */

require_once '/wordpress/wp-load.php';

define( 'WP_DEBUG', true );
define( 'WP_DEBUG_LOG', true );

// Global vars from JS.
global $blog_data;
global $consumer;

$url       = 'https://api.tumblr.com/v2/blog/' . $blog_data['name'] . '/posts';
$full_url  = $url . '?api_key=' . $consumer;
$full_url .= '&npf=true';
$full_url .= '&include_pinned_posts=true';

try {
	$response = wp_remote_get(
		$full_url,
		array(
			'sslverify' => false,
			'headers'   => array(
				'Content-Type' => 'application/json',
			),
		)
	);

	if ( ! is_wp_error( $response ) ) {
		$data = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( isset( $data['response']['posts'] ) && is_array( $data['response']['posts'] ) ) {
			$converter = new Npf2Blocks();

			foreach ( $data['response']['posts'] as $npf_post ) {
				// Define post content mapping
				$post_mapping = array(
					'title'     => array( 'title', '' ),
					'content'   => array( 'body', 'content', '' ),  // Will try 'body' first, then 'content'
					'timestamp' => array( 'timestamp', null ),
				);

				// Helper function to get post value with fallbacks
				$get_post_value = function ( $npf_post, $keys, $default_params ) use ( $converter ) {
					foreach ( $keys as $key ) {
						if ( isset( $npf_post[ $key ] ) ) {
							$value = $npf_post[ $key ];
							// Handle array content (like NPF format)
							if ( is_array( $value ) && 'content' === $key ) {
								// Convert the array to a JSON string for the converter
								return $converter->convert( wp_json_encode( $npf_post ) );
							}
							return $value;
						}
					}
					return $default_params;
				};

				// Build WordPress post array using mapping
				$wp_post = array(
					'post_title'   => $get_post_value( $npf_post, array( 'title' ), '' ),
					'post_content' => $get_post_value( $npf_post, array( 'body', 'content' ), '' ),
					'post_date'    => $get_post_value( $npf_post, array( 'timestamp' ), null )
						? gmdate( 'Y-m-d H:i:s', $npf_post['timestamp'] )
						: gmdate( 'Y-m-d H:i:s' ),
					'post_status'  => 'publish',
					'post_author'  => 1,
					'post_type'    => 'post',
				);

				$post_id = wp_insert_post( $wp_post );

				if ( $npf_post['is_pinned'] && $post_id && ! is_wp_error( $post_id ) ) {
					stick_post( $post_id );
				}
			}
		}
	}
} catch ( Exception $e ) {
	error_log( 'Error: ' . $e->getMessage() );
}
