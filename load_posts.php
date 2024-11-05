<?php

require_once '/wordpress/wp-load.php';

define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);

$posts = get_posts(array('numberposts' => -1, 'post_type' => array('post', 'page'), 'post_status' => 'any'));

foreach ($posts as $post) {
   wp_delete_post($post->ID, true);
}

$url = 'https://api.tumblr.com/v2/blog/' . $siteName . '/posts';
$full_url = $url . '?api_key=' . $consumer;

try {
   $response = wp_remote_get($full_url, array(
      'sslverify' => false,
      'headers' => array(
         'Content-Type' => 'application/json',
         'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      )
   ));

   if (!is_wp_error($response)) {
      $data = json_decode(wp_remote_retrieve_body($response), true);

      if (isset($data['response']['posts']) && is_array($data['response']['posts'])) {
         foreach ($data['response']['posts'] as $post) {
            $post_title = $post['title'] ?? 'Untitled';
            $wp_post = array(
               'post_title' => $post_title,
               'post_content' => $post['body'] ?? $post['text'] ?? '',
               'post_date' => isset($post['timestamp']) ? date('Y-m-d H:i:s', $post['timestamp']) : date('Y-m-d H:i:s'),
               'post_status' => 'publish',
               'post_author' => 1,
               'post_type' => 'post'
            );
            wp_insert_post($wp_post);
         }
      }
   }
} catch (Exception $e) {
   error_log('Error: ' . $e->getMessage());
}
