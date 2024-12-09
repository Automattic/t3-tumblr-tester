<?php
/**
 * Clear all posts and pages from the database.
 *
 * @package T3 Tumblr Tester
 */

// Get all posts and pages
$all_posts = get_posts(
	array(
		'numberposts' => -1,
		'post_type'   => array( 'post', 'page' ),
		'post_status' => 'any',
	)
);

$deleted_count = 0;

foreach ( $all_posts as $single_post ) {
	if ( wp_delete_post( $single_post->ID, true ) ) {
		++$deleted_count;
	}
}

printf( 'Deleted %d posts and pages.', $deleted_count );
