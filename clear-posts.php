<?php
/**
 * Clear all posts and pages from the database.
 *
 * @package T3 Tumblr Tester
 */

$all_posts = get_posts(
	array(
		'numberposts' => -1,
		'post_type'   => array( 'post', 'page' ),
		'post_status' => 'any',
	)
);

foreach ( $all_posts as $single_post ) {
	wp_delete_post( $single_post->ID, true );
}
