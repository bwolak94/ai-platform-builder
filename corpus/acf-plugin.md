# Advanced Custom Fields (ACF) Plugin Reference

## Overview

ACF (Advanced Custom Fields) adds custom field groups to WordPress posts, pages, users, taxonomies, and options. Fields can be defined in the UI or via PHP code.

## PHP Field Group Registration

Use `acf_add_local_field_group()` to define field groups in code (recommended for version control):

```php
if ( function_exists( 'acf_add_local_field_group' ) ) {
    acf_add_local_field_group( array(
        'key'                   => 'group_hero_section',
        'title'                 => 'Hero Section',
        'fields'                => array(
            array(
                'key'           => 'field_hero_heading',
                'label'         => 'Heading',
                'name'          => 'hero_heading',
                'type'          => 'text',
                'instructions'  => 'Main headline for the hero section.',
                'required'      => 1,
                'placeholder'   => 'Enter headline...',
            ),
            array(
                'key'           => 'field_hero_subheading',
                'label'         => 'Subheading',
                'name'          => 'hero_subheading',
                'type'          => 'textarea',
                'rows'          => 3,
            ),
            array(
                'key'           => 'field_hero_image',
                'label'         => 'Background Image',
                'name'          => 'hero_image',
                'type'          => 'image',
                'return_format' => 'array', // 'array', 'url', or 'id'
                'preview_size'  => 'medium',
                'library'       => 'all', // 'all' or 'uploadedTo'
            ),
            array(
                'key'           => 'field_hero_button_text',
                'label'         => 'Button Text',
                'name'          => 'hero_button_text',
                'type'          => 'text',
            ),
            array(
                'key'           => 'field_hero_button_url',
                'label'         => 'Button URL',
                'name'          => 'hero_button_url',
                'type'          => 'url',
            ),
        ),
        'location'              => array(
            array(
                array(
                    'param'     => 'post_type',
                    'operator'  => '==',
                    'value'     => 'page',
                ),
            ),
        ),
        'menu_order'            => 0,
        'position'              => 'normal',   // 'normal', 'acf_after_title', 'side'
        'style'                 => 'default',  // 'default', 'seamless'
        'label_placement'       => 'top',      // 'top', 'left'
        'instruction_placement' => 'label',    // 'label', 'field'
        'hide_on_screen'        => array(),
    ) );
}
```

## Retrieving Field Values

```php
// Get field value for the current post in the loop
$value = get_field( 'field_name' );

// Get field value for a specific post
$value = get_field( 'field_name', $post_id );

// Echo field directly (equivalent to echo get_field())
the_field( 'field_name' );
the_field( 'field_name', $post_id );

// ACF Options Page values
$option = get_field( 'field_name', 'option' );

// User meta
$user_value = get_field( 'field_name', 'user_' . $user_id );

// Term meta
$term_value = get_field( 'field_name', 'term_' . $term_id );
```

## Field Types & Usage

### Text, Textarea, Number, Email, URL, Password

```php
$text = get_field( 'hero_heading' );
echo esc_html( $text );

$textarea = get_field( 'bio' );
echo wp_kses_post( nl2br( esc_html( $textarea ) ) );

$number = get_field( 'price' );
echo esc_html( number_format( $number, 2 ) );
```

### Image Field

```php
$image = get_field( 'hero_image' ); // returns array when return_format = 'array'
if ( $image ) {
    echo '<img src="' . esc_url( $image['url'] ) . '"
               alt="' . esc_attr( $image['alt'] ) . '"
               width="' . esc_attr( $image['width'] ) . '"
               height="' . esc_attr( $image['height'] ) . '" />';
    // Access specific sizes
    $thumb = $image['sizes']['medium'];
    $large = $image['sizes']['large'];
}

// When return_format = 'id'
$image_id = get_field( 'hero_image' );
echo wp_get_attachment_image( $image_id, 'large' );
```

### Gallery Field

```php
$gallery = get_field( 'photo_gallery' ); // returns array of image arrays
if ( $gallery ) {
    echo '<div class="gallery">';
    foreach ( $gallery as $image ) {
        echo '<div class="gallery-item">';
        echo '<img src="' . esc_url( $image['url'] ) . '" alt="' . esc_attr( $image['alt'] ) . '" />';
        echo '</div>';
    }
    echo '</div>';
}
```

### Select, Radio, Checkbox

```php
// Select / Radio (single value)
$color = get_field( 'color' ); // returns the value string
echo esc_html( $color );

// Select with return_format = 'array'
$color_obj = get_field( 'color' );
echo esc_html( $color_obj['label'] );
echo esc_html( $color_obj['value'] );

// Checkbox (multiple values, returns array)
$colors = get_field( 'colors' );
if ( $colors ) {
    foreach ( $colors as $color ) {
        echo '<span class="badge">' . esc_html( $color ) . '</span>';
    }
}
```

### True/False (Boolean)

```php
$is_featured = get_field( 'is_featured' ); // returns true or false
if ( $is_featured ) {
    echo '<span class="featured-badge">Featured</span>';
}
```

### Link Field

```php
$link = get_field( 'button_link' ); // returns array: url, title, target
if ( $link ) {
    $target = $link['target'] ? ' target="' . esc_attr( $link['target'] ) . '"' : '';
    printf(
        '<a href="%s"%s class="btn">%s</a>',
        esc_url( $link['url'] ),
        $target,
        esc_html( $link['title'] )
    );
}
```

### Post Object / Relationship

```php
// Post Object (single, return_format = 'Post Object')
$related_post = get_field( 'related_post' );
if ( $related_post ) {
    echo '<a href="' . esc_url( get_permalink( $related_post->ID ) ) . '">';
    echo esc_html( $related_post->post_title );
    echo '</a>';
}

// Relationship (multiple posts, returns array of post objects)
$related_posts = get_field( 'related_posts' );
if ( $related_posts ) {
    foreach ( $related_posts as $post ) {
        echo '<a href="' . esc_url( get_permalink( $post->ID ) ) . '">' . esc_html( $post->post_title ) . '</a>';
    }
    wp_reset_postdata();
}
```

### Taxonomy Field

```php
// Returns array of term objects
$categories = get_field( 'project_categories' );
if ( $categories ) {
    foreach ( $categories as $term ) {
        echo '<span class="tag">' . esc_html( $term->name ) . '</span>';
    }
}
```

### WYSIWYG (Editor)

```php
$content = get_field( 'page_content' );
echo apply_filters( 'the_content', $content ); // Apply WordPress content filters
```

### File Field

```php
$file = get_field( 'download_file' ); // returns array: url, title, filename, filesize, etc.
if ( $file ) {
    printf(
        '<a href="%s" download>%s (%s)</a>',
        esc_url( $file['url'] ),
        esc_html( $file['title'] ),
        esc_html( $file['filename'] )
    );
}
```

### Date Picker

```php
// return_format = 'Y-m-d' (PHP date format string)
$date = get_field( 'event_date' );
if ( $date ) {
    $timestamp = strtotime( $date );
    echo esc_html( date_i18n( get_option( 'date_format' ), $timestamp ) );
}
```

### Color Picker

```php
$color = get_field( 'brand_color' ); // returns hex string e.g. '#ff6600'
echo '<div style="background-color: ' . esc_attr( $color ) . '">...</div>';
```

### Google Map

```php
$location = get_field( 'office_location' );
if ( $location ) {
    echo 'Lat: ' . esc_html( $location['lat'] );
    echo 'Lng: ' . esc_html( $location['lng'] );
    echo 'Address: ' . esc_html( $location['address'] );
}
```

## Repeater Field

```php
// Field group definition
array(
    'key'          => 'field_team_members',
    'label'        => 'Team Members',
    'name'         => 'team_members',
    'type'         => 'repeater',
    'min'          => 0,
    'max'          => 10,
    'layout'       => 'table', // 'table', 'block', 'row'
    'button_label' => 'Add Team Member',
    'sub_fields'   => array(
        array(
            'key'   => 'field_team_member_name',
            'label' => 'Name',
            'name'  => 'name',
            'type'  => 'text',
        ),
        array(
            'key'           => 'field_team_member_photo',
            'label'         => 'Photo',
            'name'          => 'photo',
            'type'          => 'image',
            'return_format' => 'array',
        ),
        array(
            'key'   => 'field_team_member_role',
            'label' => 'Role',
            'name'  => 'role',
            'type'  => 'text',
        ),
    ),
),

// Usage in template
$team_members = get_field( 'team_members' );
if ( $team_members ) {
    echo '<div class="team-grid">';
    foreach ( $team_members as $member ) {
        $photo = $member['photo'];
        echo '<div class="team-card">';
        if ( $photo ) {
            echo '<img src="' . esc_url( $photo['url'] ) . '" alt="' . esc_attr( $photo['alt'] ) . '" />';
        }
        echo '<h3>' . esc_html( $member['name'] ) . '</h3>';
        echo '<p>' . esc_html( $member['role'] ) . '</p>';
        echo '</div>';
    }
    echo '</div>';
}
```

## Flexible Content Field

```php
// Definition
array(
    'key'          => 'field_page_sections',
    'label'        => 'Page Sections',
    'name'         => 'page_sections',
    'type'         => 'flexible_content',
    'button_label' => 'Add Section',
    'layouts'      => array(
        'layout_hero' => array(
            'key'        => 'layout_hero',
            'name'       => 'hero',
            'label'      => 'Hero Section',
            'display'    => 'block',
            'sub_fields' => array(
                array( 'key' => 'field_hero_title', 'label' => 'Title', 'name' => 'title', 'type' => 'text' ),
                array( 'key' => 'field_hero_bg', 'label' => 'Background', 'name' => 'background', 'type' => 'image', 'return_format' => 'array' ),
            ),
        ),
        'layout_cta' => array(
            'key'        => 'layout_cta',
            'name'       => 'cta',
            'label'      => 'Call to Action',
            'display'    => 'block',
            'sub_fields' => array(
                array( 'key' => 'field_cta_heading', 'label' => 'Heading', 'name' => 'heading', 'type' => 'text' ),
                array( 'key' => 'field_cta_button', 'label' => 'Button', 'name' => 'button', 'type' => 'link' ),
            ),
        ),
    ),
),

// Template rendering
$sections = get_field( 'page_sections' );
if ( $sections ) {
    foreach ( $sections as $section ) {
        switch ( $section['acf_fc_layout'] ) {
            case 'hero':
                // render hero
                $bg = $section['background'];
                echo '<section class="hero" style="background-image: url(' . esc_url( $bg['url'] ) . ')">';
                echo '<h1>' . esc_html( $section['title'] ) . '</h1>';
                echo '</section>';
                break;
            case 'cta':
                $btn = $section['button'];
                echo '<section class="cta">';
                echo '<h2>' . esc_html( $section['heading'] ) . '</h2>';
                if ( $btn ) {
                    echo '<a href="' . esc_url( $btn['url'] ) . '">' . esc_html( $btn['title'] ) . '</a>';
                }
                echo '</section>';
                break;
        }
    }
}
```

## ACF Options Page

```php
// Register options page
if ( function_exists( 'acf_add_options_page' ) ) {
    acf_add_options_page( array(
        'page_title' => 'Site Settings',
        'menu_title' => 'Site Settings',
        'menu_slug'  => 'site-settings',
        'capability' => 'manage_options',
        'icon_url'   => 'dashicons-admin-settings',
    ) );

    acf_add_options_sub_page( array(
        'page_title'  => 'Header Settings',
        'menu_title'  => 'Header',
        'parent_slug' => 'site-settings',
    ) );
}

// Field group for options page
acf_add_local_field_group( array(
    'key'    => 'group_site_settings',
    'title'  => 'Site Settings',
    'fields' => array(
        array(
            'key'   => 'field_site_phone',
            'label' => 'Phone Number',
            'name'  => 'site_phone',
            'type'  => 'text',
        ),
        array(
            'key'           => 'field_site_logo',
            'label'         => 'Site Logo',
            'name'          => 'site_logo',
            'type'          => 'image',
            'return_format' => 'array',
        ),
    ),
    'location' => array(
        array(
            array(
                'param'    => 'options_page',
                'operator' => '==',
                'value'    => 'site-settings',
            ),
        ),
    ),
) );

// Usage
$phone = get_field( 'site_phone', 'option' );
$logo  = get_field( 'site_logo', 'option' );
```

## ACF Blocks (Gutenberg)

```php
// Register ACF Block in functions.php
add_action( 'acf/init', function() {
    if ( ! function_exists( 'acf_register_block_type' ) ) return;

    acf_register_block_type( array(
        'name'              => 'hero-section',
        'title'             => __( 'Hero Section', 'my-theme' ),
        'description'       => __( 'A custom hero section block.', 'my-theme' ),
        'render_template'   => get_template_directory() . '/template-parts/blocks/hero-section.php',
        'category'          => 'layout',
        'icon'              => 'align-wide',
        'keywords'          => array( 'hero', 'banner', 'header' ),
        'supports'          => array(
            'align'  => array( 'wide', 'full' ),
            'anchor' => true,
        ),
        'example'           => array(
            'attributes' => array(
                'mode' => 'preview',
                'data' => array(
                    'hero_heading'  => 'Welcome to Our Site',
                    'hero_subtitle' => 'We build amazing things.',
                ),
            ),
        ),
    ) );
} );

// Block template: template-parts/blocks/hero-section.php
// $block, $content, $is_preview, $post_id are available
$heading  = get_field( 'hero_heading' );
$subtitle = get_field( 'hero_subtitle' );
$image    = get_field( 'hero_background' );
$classes  = 'hero-block';
if ( ! empty( $block['className'] ) ) $classes .= ' ' . $block['className'];
if ( ! empty( $block['align'] ) ) $classes .= ' align' . $block['align'];
?>
<section id="<?php echo esc_attr( $block['id'] ?? '' ); ?>" class="<?php echo esc_attr( $classes ); ?>">
    <?php if ( $image ) : ?>
        <img src="<?php echo esc_url( $image['url'] ); ?>" alt="<?php echo esc_attr( $image['alt'] ); ?>" />
    <?php endif; ?>
    <div class="hero-content">
        <h1><?php echo esc_html( $heading ); ?></h1>
        <p><?php echo esc_html( $subtitle ); ?></p>
    </div>
</section>
```

## Location Rules

```php
// Common location rule parameters
'param'    => 'post_type',          'value' => 'page'
'param'    => 'post_type',          'value' => 'post'
'param'    => 'post_template',      'value' => 'template-full-width.php'
'param'    => 'page_type',          'value' => 'front_page'
'param'    => 'page_type',          'value' => 'posts_page'
'param'    => 'taxonomy',           'value' => 'category'
'param'    => 'user_role',          'value' => 'administrator'
'param'    => 'options_page',       'value' => 'acf-options'
'param'    => 'nav_menu',           'value' => 'all'
'param'    => 'attachment',         'value' => 'all'
'param'    => 'comment',            'value' => 'all'
'param'    => 'widget',             'value' => 'all'
// Operators: '==', '!='
```

## Utility Functions

```php
// Check if a field has a value
if ( get_field( 'my_field' ) ) { ... }
if ( have_rows( 'repeater_field' ) ) { ... }

// ACF have_rows / the_row / get_sub_field
if ( have_rows( 'team_members' ) ) {
    while ( have_rows( 'team_members' ) ) {
        the_row();
        $name = get_sub_field( 'name' );
        $photo = get_sub_field( 'photo' );
    }
}

// Get field object (metadata)
$field = get_field_object( 'field_hero_heading' );
$choices = $field['choices']; // for select/radio fields

// Update field value programmatically
update_field( 'hero_heading', 'New Heading', $post_id );

// Delete field value
delete_field( 'hero_heading', $post_id );

// ACF content filters
add_filter( 'acf/load_field/name=color', function( $field ) {
    $field['choices'] = array(
        'red'  => 'Red',
        'blue' => 'Blue',
    );
    return $field;
} );

// Validate field value
add_filter( 'acf/validate_value/name=email_field', function( $valid, $value ) {
    if ( ! is_email( $value ) ) {
        return 'Please enter a valid email address.';
    }
    return $valid;
}, 10, 2 );
```
