<?php

$posts = get_posts(array(
   'numberposts' => -1,
   'post_type' => array('post', 'page'),
   'post_status' => 'any'
));

foreach ($posts as $post) {
   wp_delete_post($post->ID, true);
}
