<?php
require '/wordpress/wp-load.php';

switch_theme('tumblr3');

update_option('blogname', $siteName);

update_option('blogdescription', $blogDescription);

// Get the most recently uploaded attachment if $attachment_id is not set
if (!isset($attachment_id)) {
   $args = array(
      'post_type' => 'attachment',
      'numberposts' => 1,
      'orderby' => 'date',
      'order' => 'DESC'
   );
   $recent_attachment = get_posts($args);
   $attachment_id = $recent_attachment[0]->ID;
}

update_option('theme_mods_tumblr3', array(
   'background_color' => $backgroundColor,
   'accent_color' => $linkColor,
   'header_textcolor' => $titleColor,
   'header_image' => $headerImage,
   'custom_logo' => $attachment_id,
));
