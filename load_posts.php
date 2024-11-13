<?php

require_once '/wordpress/wp-load.php';

define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);

$url = 'https://api.tumblr.com/v2/blog/' . $blogData['name'] . '/posts';
$full_url = $url . '?api_key=' . $consumer;
// $full_url .= '&include_pinned_posts=true'; // does not work, only accepted from redpop / mobile apps.
$full_url .= '&npf=true';

try {
   $response = wp_remote_get($full_url, array(
      'sslverify' => false,
      'headers' => array(
         'Content-Type' => 'application/json',
      )
   ));

   if (!is_wp_error($response)) {
      $data = json_decode(wp_remote_retrieve_body($response), true);

      if (isset($data['response']['posts']) && is_array($data['response']['posts'])) {
         $converter = new Npf2Blocks();

         foreach ($data['response']['posts'] as $post) {
            // Define post content mapping
            $post_mapping = [
               'title' => ['title', ''],
               'content' => ['body', 'content', ''],  // Will try 'body' first, then 'content'
               'timestamp' => ['timestamp', null]
            ];

            // Helper function to get post value with fallbacks
            $get_post_value = function ($post, $keys, $default) use ($converter) {
               foreach ($keys as $key) {
                  if (isset($post[$key])) {
                     $value = $post[$key];
                     // Handle array content (like NPF format)
                     if (is_array($value) && $key === 'content') {
                        // Convert the array to a JSON string for the converter
                        return $converter->convert(json_encode($post));
                     }
                     return $value;
                  }
               }
               return $default;
            };

            // Build WordPress post array using mapping
            $wp_post = array(
               'post_title' => $get_post_value($post, ['title'], ''),
               'post_content' => $get_post_value($post, ['body', 'content'], ''),
               'post_date' => $get_post_value($post, ['timestamp'], null)
                  ? date('Y-m-d H:i:s', $post['timestamp'])
                  : date('Y-m-d H:i:s'),
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
