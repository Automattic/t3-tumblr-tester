<?php

/**
 * Converts NPF format JSON to Gutenberg HTML.
 */
class Npf2Blocks
{

   /**
    * Converts NPF format JSON to Gutenberg HTML.
    *
    * @param string $npf_post The NPF format JSON string.
    *
    * @return string The equivalent Gutenberg HTML.
    */
   public function convert(string $npf_post): string
   {
      // Decode NPF JSON to get an array
      $npf = json_decode($npf_post, true);
      $blocks = array();

      $nested_items = array();
      $nested_block = false;
      $nested_block_subtype = '';

      // Convert each NPF block to Gutenberg block
      foreach ($npf['content'] as $block) {
         $subtype = $block['subtype'] ?? null;
         if ('text' === $block['type'] && ('unordered-list-item' === $subtype || 'ordered-list-item' === $subtype)) {
            // Handle list items
            if ($nested_block && $nested_block_subtype !== $subtype) {
               // If we encounter a different list subtype, close the previous list
               $blocks[] = $this->close_list($nested_block_subtype, $nested_items);
               $nested_items = array();
            }

            $nested_block = true;
            $nested_block_subtype = $subtype;
            $nested_items[] = $this->make_list_item($block['text']);
         } elseif ('image' === $block['type']) {
            $nested_block = true;
            $blocks[] = $this->make_image_block($block);
         } else {
            if ($nested_block) {
               // If we were in a list and now there's a new block, close the list
               $blocks[] = $this->close_list($nested_block_subtype, $nested_items);

               // Reset nested items
               $nested_items = array();
               $nested_block = false;
            }
            // Handle regular blocks
            $blocks[] = $this->make_block($block);
         }
      }

      // If there's an unfinished list, add it
      if ($nested_block) {
         $blocks[] = $this->close_list($nested_block_subtype, $nested_items);
      }

      // Serialize Gutenberg blocks to HTML
      return serialize_blocks($blocks);
   }

   /**
    * Helper function to create a Gutenberg text block.
    *
    * @param array $block The block data.
    *
    * @return array
    */
   private function make_text_block_with_subtype(array $block): array
   {

      return match ($block['subtype'] ?? null) {
         'heading1' => $this->make_h1($block['text']),
         'heading2' => $this->make_h2($block['text']),
         'quote' => $this->make_quote($block['text'], $block['formatting'] ?? array()),
         'chat' => $this->make_chat($block['text'], $block['formatting'] ?? array()),
         'quirky' => $this->make_quirky($block['text']),
         'indented' => $this->make_indented($block['text'], $block['formatting'] ?? array()),
         default => $this->make_paragraph($block['text'], $block['formatting'] ?? array()),
      };
   }

   /**
    * Helper function to create a Gutenberg quote block.
    *
    * @param string $text       The quote text.
    * @param array  $formatting The formatting data.
    *
    * @return array
    */
   private function make_quote(string $text, array $formatting = array()): array
   {
      $html_content = $this->apply_formatting($text, $formatting);

      // Replace newlines with <br> tags, there is not a direct equivalent in Gutenberg for chat
      $text_with_brs = str_replace("\n", '<br>', $html_content);

      return array(
         'blockName' => 'core/quote',
         'attrs' => array(),
         'innerBlocks' => array(
            array(
               'blockName' => 'core/paragraph',
               'attrs' => array(),
               'innerBlocks' => array(),
               'innerHTML' => '<p>' . $text_with_brs . '</p>',
               'innerContent' => array(
                  '<p>' . $text_with_brs . '</p>',
               ),
            ),
         ),
         'innerHTML' => '<blockquote class="wp-block-quote"></blockquote>',
         'innerContent' => array(
            '<blockquote class="wp-block-quote">',
            null,
            '</blockquote>',
         ),
      );
   }

   /**
    * Helper function to create a Gutenberg chat block.
    *
    * @param string $text       The quote text.
    * @param array  $formatting The formatting data.
    *
    * @return array
    */
   private function make_chat(string $text, array $formatting = array()): array
   {
      $html_content = $this->apply_formatting($text, $formatting);

      // Replace newlines with <br> tags, there is not a direct equivalent in Gutenberg for chat
      $text_with_brs = str_replace("\n", '<br>', $html_content);

      return array(
         'blockName' => 'core/quote',
         'attrs' => array(
            'className' => 'chat',
         ),
         'innerBlocks' => array(
            array(
               'blockName' => 'core/paragraph',
               'attrs' => array(),
               'innerBlocks' => array(),
               'innerHTML' => '<p>' . $text_with_brs . '</p>',
               'innerContent' => array(
                  '<p>' . $text_with_brs . '</p>',
               ),
            ),
         ),
         'innerHTML' => '<blockquote class="wp-block-quote"></blockquote>',
         'innerContent' => array(
            '<blockquote class="wp-block-quote">',
            null,
            '</blockquote>',
         ),
      );
   }

   /**
    * Helper function to create a Gutenberg quirky block.
    *
    * @param string $text The quote text.
    *
    * @return array
    */
   private function make_quirky(string $text): array
   {
      // Replace newlines with <br> tags, there is not a direct equivalent in Gutenberg for chat
      $text_with_brs = str_replace("\n", '<br>', $text);

      return array(
         'blockName' => 'core/quote',
         'attrs' => array(
            'className' => 'quirky',
         ),
         'innerBlocks' => array(
            array(
               'blockName' => 'core/paragraph',
               'attrs' => array(),
               'innerBlocks' => array(),
               'innerHTML' => '<p>' . $text_with_brs . '</p>',
               'innerContent' => array(
                  '<p>' . $text_with_brs . '</p>',
               ),
            ),
         ),
         'innerHTML' => '<blockquote class="wp-block-quote"></blockquote>',
         'innerContent' => array(
            '<blockquote class="wp-block-quote">',
            null,
            '</blockquote>',
         ),
      );
   }

   /**
    * Helper function to create a Gutenberg H1 block.
    *
    * @param string $text The quote text.
    *
    * @return array
    */
   private function make_h1(string $text): array
   {
      return array(
         'blockName' => 'core/heading',
         'attrs' => array(
            'level' => 1,
         ),
         'innerBlocks' => array(),
         'innerHTML' => '<h1 class="wp-block-heading">' . $text . '</h1>',
         'innerContent' => array(
            '<h1 class="wp-block-heading">' . $text . '</h1>',
         ),
      );
   }

   /**
    * Helper function to create a Gutenberg H2 block.
    *
    * @param string $text The quote text.
    *
    * @return array
    */
   private function make_h2(string $text): array
   {
      return array(
         'blockName' => 'core/heading',
         'attrs' => array(),
         'innerBlocks' => array(),
         'innerHTML' => '<h2 class="wp-block-heading">' . $text . '</h2>',
         'innerContent' => array(
            '<h2 class="wp-block-heading">' . $text . '</h2>',
         ),
      );
   }

   /**
    * Helper function to create a Gutenberg paragraph block.
    *
    * @param string $text       The quote text.
    * @param array  $formatting The formatting data.
    *
    * @return array
    */
   public function make_paragraph(string $text, array $formatting = array()): array
   {
      $html_content = $this->apply_formatting($text, $formatting);
      return array(
         'blockName' => 'core/paragraph',
         'attrs' => array(),
         'innerBlocks' => array(),
         'innerHTML' => '<p>' . $html_content . '</p>',
         'innerContent' => array(
            '<p>' . $html_content . '</p>',
         ),
      );
   }

   /**
    * Helper function to apply formatting to text.
    *
    * @param string $text       The text to format.
    * @param array  $formatting The formatting data.
    *
    * @return string The formatted text.
    */
   private function apply_formatting(string $text, array $formatting): string
   {
      if (empty($formatting)) {
         return htmlspecialchars($text);
      }

      usort($formatting, static fn($a, $b) => $a['start'] - $b['start']);

      $text_format_ranges = array(
         array(
            'start' => 0,
            'end' => strlen($text),
            'formats' => array(),
         ),
      );

      $text_format_ranges_from = 0;

      foreach ($formatting as $format) {
         for ($i = $text_format_ranges_from, $i_max = count($text_format_ranges); $i < $i_max; $i++) {
            $text_format_range = &$text_format_ranges[$i];

            if ($format['end'] <= $text_format_range['start']) {
               continue;
            }

            if ($format['start'] >= $text_format_range['end']) {
               $text_format_ranges_from = $i + 1;
               continue;
            }

            if ($format['start'] <= $text_format_range['start'] && $format['end'] >= $text_format_range['end']) {
               $text_format_range['formats'][] = $format;
               continue;
            }

            if ($format['start'] > $text_format_range['start']) {
               $prev_fragment = array(
                  'start' => $text_format_range['start'],
                  'end' => $format['start'],
                  'formats' => $text_format_range['formats'],
               );
               array_splice($text_format_ranges, $i, 0, array($prev_fragment));
               ++$i;
            }

            if ($format['end'] < $text_format_range['end']) {
               $next_fragment = array(
                  'start' => $format['end'],
                  'end' => $text_format_range['end'],
                  'formats' => $text_format_range['formats'],
               );
               array_splice($text_format_ranges, $i + 1, 0, array($next_fragment));
               ++$i;
            }

            $text_format_range['start'] = max($text_format_range['start'], $format['start']);
            $text_format_range['end'] = min($text_format_range['end'], $format['end']);
            $text_format_range['formats'][] = $format;
         }
      }

      $formatted_text = '';

      foreach ($text_format_ranges as $range) {
         $text_slice = substr($text, $range['start'], $range['end'] - $range['start']);
         foreach ($range['formats'] as $format) {
            $tag = match ($format['type']) {
               'bold' => 'strong',
               'italic' => 'em',
               default => '',
            };

            if ($tag) {
               $text_slice = "<{$tag}>{$text_slice}</{$tag}>";
            }
         }
         $formatted_text .= $text_slice;
      }

      return $formatted_text;
   }


   /**
    * Helper function to create a Gutenberg indented block.
    *
    * @param string $text       The text to format.
    * @param array  $formatting The formatting data.
    *
    * @return array
    */
   public function make_indented(string $text, array $formatting = array()): array
   {
      $html_content = $this->apply_formatting($text, $formatting);
      // Replace newlines with <br> tags, there is not a direct equivalent in Gutenberg for chat
      $text_with_brs = str_replace("\n", '<br>', $html_content);

      return array(
         'blockName' => 'core/pullquote',
         'attrs' => array(),
         'innerBlocks' => array(),
         'innerHTML' => '<figure class="wp-block-pullquote"><blockquote><p>' . $text_with_brs . '</p></blockquote></figure>',
         'innerContent' => array(
            '<figure class="wp-block-pullquote"><blockquote><p>' . $text_with_brs . '</p></blockquote></figure>',
         ),
      );
   }

   /**
    * Helper function to create a Gutenberg unordered list block.
    *
    * @param array $list_items The list items.
    *
    * @return array
    */
   private function make_unordered_list(array $list_items): array
   {
      return array(
         'blockName' => 'core/list',
         'attrs' => array(),
         'innerBlocks' => $list_items,
         'innerHTML' => '<ul class="wp-block-list"></ul>',
         'innerContent' => array(
            '<ul class="wp-block-list">',
            ...array_map(static fn() => null, $list_items), // Add nulls for inner content
            '</ul>',
         ),
      );
   }

   /**
    * Helper function to create a Gutenberg unordered list block.
    *
    * @param array $list_items The list items.
    *
    * @return array
    */
   private function make_ordered_list(array $list_items): array
   {
      return array(
         'blockName' => 'core/list',
         'attrs' => array(
            'ordered' => true,
         ),
         'innerBlocks' => $list_items,
         'innerHTML' => '<ol class="wp-block-list"></ol>',
         'innerContent' => array(
            '<ol class="wp-block-list">',
            ...array_map(static fn() => null, $list_items), // Add nulls for inner content
            '</ol>',
         ),
      );
   }

   /**
    * Helper function to create a Gutenberg list item block.
    *
    * @param string $text The list item text.
    *
    * @return array
    */
   private function make_list_item(string $text): array
   {
      return array(
         'blockName' => 'core/list-item',
         'attrs' => array(),
         'innerBlocks' => array(),
         'innerHTML' => '<li>' . $text . '</li>',
         'innerContent' => array(
            '<li>' . $text . '</li>',
         ),
      );
   }

   /**
    * Helper function to close a list block.
    *
    * @param string $subtype    The subtype of the list (ordered or unordered).
    * @param array  $list_items The list items.
    *
    * @return array The Gutenberg block representing the list.
    */
   private function close_list(string $subtype, array $list_items): array
   {
      return match ($subtype) {
         'unordered-list-item' => $this->make_unordered_list($list_items),
         'ordered-list-item' => $this->make_ordered_list($list_items),
         default => array(),
      };
   }

   /**
    * Helper function to create a Gutenberg block.
    *
    * @param array $block The block data.
    *
    * @return array
    */
   public function make_block(array $block): array
   {
      return match ($block['type'] ?? null) {
         'text' => $this->make_text_block_with_subtype($block),
         'image' => $this->make_image_block($block),
         'audio' => $this->make_audio_block($block),
         default => $this->make_paragraph($block['content'], $block['formatting'] ?? array()),
      };
   }

   /**
    * Helper function to create a Gutenberg image block.
    *
    * @param array $block The block data.
    *
    * @return array
    */
   private function make_image_block(array $block): array
   {
      return array(
         'blockName' => 'core/image',
         'attrs' => array(
            'url' => array(
               array(
                  'type' => $block['type'] ?? '',
                  'source' => $block['media'][0]['url'] ?? '',
               ),
            ),
         ),
         'innerBlocks' => array(),
         'innerHTML' => '<figure class="wp-block-image"><img src="' . $block['media'][0]['url'] . '" width="' . $block['media'][0]['width'] . '" height="' . $block['media'][0]['height'] . '"></figure>',
         'innerContent' => array(
            '<figure class="wp-block-image"><img src="' . $block['media'][0]['url'] . '" width="' . $block['width'] . '" height="' . $block['height'] . '"></figure>',
         ),
      );
   }

   /**
    * Helper function to create a Gutenberg audio block.
    *
    * @param array $block The block data.
    *
    * @return array
    */
   private function make_audio_block(array $block): array
   {
      return array(
         'blockName' => 'core/audio',
         'attrs' => array(
            'src' => array(
               array(
                  'type' => $block['type'] ?? '',
                  'source' => $block['url'] ?? '',
               ),
            ),
         ),
         'innerBlocks' => array(),
         'innerHTML' => '<figure class="wp-block-audio"><audio controls src="' . $block['url'] . '"></audio></figure>',
         'innerContent' => array(
            '<figure class="wp-block-audio"><audio controls src="' . $block['url'] . '"></audio></figure>',
         ),
      );
   }
}
