# WordPress Theme Development Reference

## Theme File Structure

```
my-theme/
├── style.css           (required - theme header)
├── functions.php       (enqueue scripts, theme support, hooks)
├── index.php           (required fallback template)
├── header.php          (get_header())
├── footer.php          (get_footer())
├── sidebar.php         (get_sidebar())
├── single.php          (single post)
├── page.php            (static page)
├── archive.php         (post archives)
├── search.php          (search results)
├── 404.php             (not found)
├── comments.php        (comments loop)
├── front-page.php      (static front page)
├── home.php            (blog index)
├── category.php        (category archive)
├── tag.php             (tag archive)
├── author.php          (author archive)
├── date.php            (date archive)
├── attachment.php      (attachment pages)
├── template-parts/
│   ├── content.php
│   ├── content-page.php
│   ├── content-none.php
│   └── content-search.php
├── inc/
│   ├── enqueue.php
│   ├── theme-support.php
│   ├── custom-post-types.php
│   ├── acf-fields.php
│   └── widgets.php
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
└── languages/
```

## style.css Theme Header (required)

```css
/*
Theme Name: My Theme
Theme URI: https://example.com/my-theme
Author: Developer Name
Author URI: https://example.com
Description: A custom WordPress theme.
Version: 1.0.0
License: GNU General Public License v2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
Text Domain: my-theme
Tags: custom, responsive
*/
```

## functions.php - Core Patterns

### Theme Setup

```php
<?php
function my_theme_setup() {
    // Enable post thumbnails
    add_theme_support( 'post-thumbnails' );

    // Enable title tag management by WordPress
    add_theme_support( 'title-tag' );

    // HTML5 markup support
    add_theme_support( 'html5', array(
        'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script'
    ) );

    // Automatic feed links
    add_theme_support( 'automatic-feed-links' );

    // Wide alignment support (for block editor)
    add_theme_support( 'align-wide' );

    // Editor styles
    add_editor_style( 'assets/css/editor-style.css' );

    // Custom logo
    add_theme_support( 'custom-logo', array(
        'height'      => 100,
        'width'       => 400,
        'flex-height' => true,
        'flex-width'  => true,
    ) );

    // Navigation menus
    register_nav_menus( array(
        'primary'   => __( 'Primary Menu', 'my-theme' ),
        'footer'    => __( 'Footer Menu', 'my-theme' ),
        'social'    => __( 'Social Links Menu', 'my-theme' ),
    ) );

    // Post formats
    add_theme_support( 'post-formats', array(
        'aside', 'gallery', 'link', 'image', 'quote', 'status', 'video', 'audio', 'chat'
    ) );

    // Load text domain
    load_theme_textdomain( 'my-theme', get_template_directory() . '/languages' );

    // Set content width
    if ( ! isset( $content_width ) ) {
        $content_width = 1200;
    }
}
add_action( 'after_setup_theme', 'my_theme_setup' );
```

### Enqueue Scripts & Styles

```php
function my_theme_scripts() {
    // Enqueue main stylesheet
    wp_enqueue_style(
        'my-theme-style',
        get_stylesheet_uri(),
        array(),
        wp_get_theme()->get( 'Version' )
    );

    // Enqueue custom CSS
    wp_enqueue_style(
        'my-theme-main',
        get_template_directory_uri() . '/assets/css/main.css',
        array( 'my-theme-style' ),
        '1.0.0'
    );

    // Enqueue main JS
    wp_enqueue_script(
        'my-theme-main',
        get_template_directory_uri() . '/assets/js/main.js',
        array( 'jquery' ),
        '1.0.0',
        true // load in footer
    );

    // Pass PHP data to JS
    wp_localize_script( 'my-theme-main', 'myTheme', array(
        'ajaxUrl' => admin_url( 'admin-ajax.php' ),
        'nonce'   => wp_create_nonce( 'my_theme_nonce' ),
    ) );

    // Enqueue comment reply script
    if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
        wp_enqueue_script( 'comment-reply' );
    }
}
add_action( 'wp_enqueue_scripts', 'my_theme_scripts' );
```

### Register Widget Areas (Sidebars)

```php
function my_theme_widgets_init() {
    register_sidebar( array(
        'name'          => __( 'Primary Sidebar', 'my-theme' ),
        'id'            => 'sidebar-1',
        'description'   => __( 'Add widgets here to appear in the sidebar.', 'my-theme' ),
        'before_widget' => '<section id="%1$s" class="widget %2$s">',
        'after_widget'  => '</section>',
        'before_title'  => '<h2 class="widget-title">',
        'after_title'   => '</h2>',
    ) );

    register_sidebar( array(
        'name'          => __( 'Footer Widget Area', 'my-theme' ),
        'id'            => 'footer-1',
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget'  => '</div>',
        'before_title'  => '<h3 class="widget-title">',
        'after_title'   => '</h3>',
    ) );
}
add_action( 'widgets_init', 'my_theme_widgets_init' );
```

## Template Hierarchy

WordPress selects templates in this order (most specific first):

- **Single post**: single-{post-type}-{slug}.php → single-{post-type}.php → single.php → singular.php → index.php
- **Page**: custom-template.php → page-{slug}.php → page-{id}.php → page.php → singular.php → index.php
- **Archive**: archive-{post-type}.php → archive.php → index.php
- **Category**: category-{slug}.php → category-{id}.php → category.php → archive.php → index.php
- **Tag**: tag-{slug}.php → tag-{id}.php → tag.php → archive.php → index.php
- **Home/Blog**: home.php → index.php
- **Front Page**: front-page.php → home.php → index.php
- **404**: 404.php → index.php
- **Search**: search.php → index.php
- **Attachment**: {mime-type}.php → attachment.php → single.php → index.php

## The Loop

```php
if ( have_posts() ) :
    while ( have_posts() ) :
        the_post();
        // Template tags inside the loop:
        the_ID();
        the_title();
        the_content();
        the_excerpt();
        the_permalink();
        the_post_thumbnail( 'large' );
        the_date();
        the_author_posts_link();
        the_category();
        the_tags();
    endwhile;

    // Pagination
    the_posts_pagination( array(
        'prev_text' => __( '&laquo; Previous', 'my-theme' ),
        'next_text' => __( 'Next &raquo;', 'my-theme' ),
    ) );
else :
    get_template_part( 'template-parts/content', 'none' );
endif;
```

## Template Tags Quick Reference

| Function                                                | Purpose                                 |
| ------------------------------------------------------- | --------------------------------------- |
| `get_header()`                                          | Include header.php                      |
| `get_footer()`                                          | Include footer.php                      |
| `get_sidebar()`                                         | Include sidebar.php                     |
| `get_template_part( 'template-parts/content', 'post' )` | Include template-parts/content-post.php |
| `bloginfo( 'name' )`                                    | Site name                               |
| `get_template_directory_uri()`                          | Theme URL                               |
| `get_stylesheet_directory_uri()`                        | Child theme URL                         |
| `home_url( '/' )`                                       | Site home URL                           |
| `wp_nav_menu( array( 'theme_location' => 'primary' ) )` | Render nav menu                         |
| `dynamic_sidebar( 'sidebar-1' )`                        | Render widget area                      |
| `wp_head()`                                             | Required in <head>                      |
| `wp_footer()`                                           | Required before </body>                 |
| `body_class()`                                          | Body CSS classes                        |
| `post_class()`                                          | Post wrapper CSS classes                |
| `is_single()`                                           | Check: single post page                 |
| `is_page()`                                             | Check: page                             |
| `is_archive()`                                          | Check: archive page                     |
| `is_home()`                                             | Check: blog index                       |
| `is_front_page()`                                       | Check: front page                       |
| `is_search()`                                           | Check: search results                   |
| `is_404()`                                              | Check: 404 page                         |

## Custom Page Templates

Create a PHP file in the theme root with a Template Name comment:

```php
<?php
/**
 * Template Name: Full Width Page
 * Template Post Type: page, post
 */

get_header();
// template content
get_footer();
```

## WP_Query - Custom Queries

```php
$args = array(
    'post_type'      => 'post',
    'posts_per_page' => 6,
    'orderby'        => 'date',
    'order'          => 'DESC',
    'category_name'  => 'news',
    'meta_query'     => array(
        array(
            'key'     => 'featured',
            'value'   => '1',
            'compare' => '=',
        ),
    ),
    'tax_query'      => array(
        array(
            'taxonomy' => 'portfolio_category',
            'field'    => 'slug',
            'terms'    => array( 'web-design', 'branding' ),
        ),
    ),
);

$query = new WP_Query( $args );

if ( $query->have_posts() ) :
    while ( $query->have_posts() ) :
        $query->the_post();
        // output
    endwhile;
    wp_reset_postdata(); // Always reset after custom queries
endif;
```

## Conditional Tags

```php
is_home()           // Blog index
is_front_page()     // Static front page
is_single()         // Single post
is_page()           // Static page
is_page( 'about' )  // Specific page by slug
is_category()       // Category archive
is_tag()            // Tag archive
is_archive()        // Any archive
is_search()         // Search results
is_404()            // 404 page
is_singular()       // Single post or page
is_admin()          // WordPress admin
is_user_logged_in() // User authentication check
```

## Thumbnail / Featured Image Sizes

```php
// Register custom image sizes in functions.php
add_image_size( 'hero-image', 1920, 600, true );   // true = hard crop
add_image_size( 'card-thumbnail', 400, 300, true );
add_image_size( 'square-thumbnail', 200, 200, true );

// Add sizes to Media Library selector
add_filter( 'image_size_names_choose', function( $sizes ) {
    return array_merge( $sizes, array(
        'hero-image'      => __( 'Hero Image', 'my-theme' ),
        'card-thumbnail'  => __( 'Card Thumbnail', 'my-theme' ),
    ) );
} );

// Use in templates
the_post_thumbnail( 'card-thumbnail' );
echo wp_get_attachment_image( $attachment_id, 'hero-image' );
```

## theme.json (Block Editor / Full Site Editing)

```json
{
  "$schema": "https://schemas.wp.org/trunk/theme.json",
  "version": 2,
  "settings": {
    "color": {
      "palette": [
        { "slug": "primary", "color": "#0073aa", "name": "Primary" },
        { "slug": "secondary", "color": "#23282d", "name": "Secondary" },
        { "slug": "accent", "color": "#f0f0f1", "name": "Accent" }
      ]
    },
    "typography": {
      "fontSizes": [
        { "slug": "small", "size": "0.875rem", "name": "Small" },
        { "slug": "medium", "size": "1rem", "name": "Medium" },
        { "slug": "large", "size": "1.5rem", "name": "Large" },
        { "slug": "x-large", "size": "2.25rem", "name": "XL" }
      ]
    },
    "layout": {
      "contentSize": "800px",
      "wideSize": "1200px"
    }
  },
  "styles": {
    "color": {
      "background": "var(--wp--preset--color--primary)",
      "text": "var(--wp--preset--color--secondary)"
    },
    "typography": {
      "fontSize": "var(--wp--preset--font-size--medium)",
      "lineHeight": "1.6"
    }
  }
}
```

## Security Best Practices

```php
// Always escape output
echo esc_html( $variable );          // Plain text
echo esc_url( $url );                // URLs
echo esc_attr( $attribute );         // HTML attributes
echo wp_kses_post( $html_content );  // Allow safe HTML tags
echo esc_textarea( $text );          // Textarea content

// Sanitize input
$clean = sanitize_text_field( $_POST['input'] );
$email = sanitize_email( $_POST['email'] );
$url   = esc_url_raw( $_POST['url'] );
$int   = absint( $_POST['number'] );

// Nonce verification
wp_nonce_field( 'my_action', 'my_nonce' );
if ( ! wp_verify_nonce( $_POST['my_nonce'], 'my_action' ) ) {
    wp_die( 'Security check failed' );
}

// Capability checks
if ( ! current_user_can( 'manage_options' ) ) {
    wp_die( 'You do not have permission.' );
}
```
