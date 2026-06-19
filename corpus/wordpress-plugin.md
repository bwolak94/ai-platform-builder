# WordPress Plugin Development Reference

## Plugin File Structure

```
my-plugin/
├── my-plugin.php          (main plugin file with header)
├── readme.txt             (WordPress.org readme)
├── uninstall.php          (cleanup on uninstall)
├── includes/
│   ├── class-my-plugin.php           (main plugin class)
│   ├── class-my-plugin-activator.php (activation hook handler)
│   ├── class-my-plugin-deactivator.php
│   ├── class-my-plugin-loader.php    (hook registration)
│   └── class-my-plugin-i18n.php      (text domain)
├── admin/
│   ├── class-my-plugin-admin.php
│   ├── css/
│   │   └── my-plugin-admin.css
│   ├── js/
│   │   └── my-plugin-admin.js
│   └── partials/
│       └── my-plugin-admin-display.php
├── public/
│   ├── class-my-plugin-public.php
│   ├── css/
│   │   └── my-plugin-public.css
│   ├── js/
│   │   └── my-plugin-public.js
│   └── partials/
│       └── my-plugin-public-display.php
└── languages/
    └── my-plugin.pot
```

## Main Plugin File Header (required)

```php
<?php
/**
 * Plugin Name:       My Plugin
 * Plugin URI:        https://example.com/my-plugin
 * Description:       A powerful WordPress plugin.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            Developer Name
 * Author URI:        https://example.com
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       my-plugin
 * Domain Path:       /languages
 */

// Prevent direct file access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'MY_PLUGIN_VERSION', '1.0.0' );
define( 'MY_PLUGIN_FILE', __FILE__ );
define( 'MY_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'MY_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Include main class
require_once MY_PLUGIN_DIR . 'includes/class-my-plugin.php';

// Activation / Deactivation
register_activation_hook( __FILE__, array( 'My_Plugin_Activator', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'My_Plugin_Deactivator', 'deactivate' ) );

// Run the plugin
$plugin = new My_Plugin();
$plugin->run();
```

## Activation & Deactivation Hooks

```php
class My_Plugin_Activator {
    public static function activate() {
        // Create database tables
        global $wpdb;
        $table_name = $wpdb->prefix . 'my_plugin_data';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            created_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
            name tinytext NOT NULL,
            value text NOT NULL,
            PRIMARY KEY  (id)
        ) $charset_collate;";

        require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
        dbDelta( $sql );

        // Set default options
        add_option( 'my_plugin_option', 'default_value' );

        // Flush rewrite rules (needed if CPTs are registered)
        flush_rewrite_rules();
    }
}

class My_Plugin_Deactivator {
    public static function deactivate() {
        flush_rewrite_rules();
        // Note: do NOT delete data here — use uninstall.php for that
    }
}
```

## Settings API

```php
class My_Plugin_Admin {
    public function __construct() {
        add_action( 'admin_menu', array( $this, 'add_plugin_page' ) );
        add_action( 'admin_init', array( $this, 'register_settings' ) );
    }

    public function add_plugin_page() {
        add_menu_page(
            __( 'My Plugin Settings', 'my-plugin' ),
            __( 'My Plugin', 'my-plugin' ),
            'manage_options',
            'my-plugin',
            array( $this, 'render_settings_page' ),
            'dashicons-admin-generic',
            80
        );

        add_submenu_page(
            'my-plugin',
            __( 'General Settings', 'my-plugin' ),
            __( 'Settings', 'my-plugin' ),
            'manage_options',
            'my-plugin-settings',
            array( $this, 'render_settings_page' )
        );
    }

    public function register_settings() {
        register_setting( 'my_plugin_group', 'my_plugin_option', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => '',
        ) );

        add_settings_section(
            'my_plugin_section_main',
            __( 'Main Settings', 'my-plugin' ),
            array( $this, 'render_section_info' ),
            'my-plugin-settings'
        );

        add_settings_field(
            'my_plugin_field_api_key',
            __( 'API Key', 'my-plugin' ),
            array( $this, 'render_api_key_field' ),
            'my-plugin-settings',
            'my_plugin_section_main'
        );
    }

    public function render_settings_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }
        ?>
        <div class="wrap">
            <h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
            <form action="options.php" method="post">
                <?php
                settings_fields( 'my_plugin_group' );
                do_settings_sections( 'my-plugin-settings' );
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }

    public function render_api_key_field() {
        $value = get_option( 'my_plugin_api_key', '' );
        ?>
        <input type="text"
               name="my_plugin_api_key"
               value="<?php echo esc_attr( $value ); ?>"
               class="regular-text" />
        <p class="description"><?php esc_html_e( 'Enter your API key.', 'my-plugin' ); ?></p>
        <?php
    }
}
```

## Custom Post Types

```php
function my_plugin_register_cpt() {
    $labels = array(
        'name'               => _x( 'Portfolio Items', 'post type general name', 'my-plugin' ),
        'singular_name'      => _x( 'Portfolio Item', 'post type singular name', 'my-plugin' ),
        'menu_name'          => _x( 'Portfolio', 'admin menu', 'my-plugin' ),
        'add_new'            => _x( 'Add New', 'portfolio item', 'my-plugin' ),
        'add_new_item'       => __( 'Add New Portfolio Item', 'my-plugin' ),
        'edit_item'          => __( 'Edit Portfolio Item', 'my-plugin' ),
        'new_item'           => __( 'New Portfolio Item', 'my-plugin' ),
        'view_item'          => __( 'View Portfolio Item', 'my-plugin' ),
        'search_items'       => __( 'Search Portfolio Items', 'my-plugin' ),
        'not_found'          => __( 'No portfolio items found.', 'my-plugin' ),
        'not_found_in_trash' => __( 'No portfolio items found in Trash.', 'my-plugin' ),
    );

    $args = array(
        'labels'             => $labels,
        'public'             => true,
        'publicly_queryable' => true,
        'show_ui'            => true,
        'show_in_menu'       => true,
        'query_var'          => true,
        'rewrite'            => array( 'slug' => 'portfolio' ),
        'capability_type'    => 'post',
        'has_archive'        => true,
        'hierarchical'       => false,
        'menu_position'      => 5,
        'menu_icon'          => 'dashicons-portfolio',
        'supports'           => array( 'title', 'editor', 'thumbnail', 'excerpt' ),
        'show_in_rest'       => true, // Enable Gutenberg
    );

    register_post_type( 'portfolio_item', $args );
}
add_action( 'init', 'my_plugin_register_cpt' );
```

## Custom Taxonomies

```php
function my_plugin_register_taxonomy() {
    $labels = array(
        'name'              => _x( 'Portfolio Categories', 'taxonomy general name', 'my-plugin' ),
        'singular_name'     => _x( 'Category', 'taxonomy singular name', 'my-plugin' ),
        'search_items'      => __( 'Search Categories', 'my-plugin' ),
        'all_items'         => __( 'All Categories', 'my-plugin' ),
        'parent_item'       => __( 'Parent Category', 'my-plugin' ),
        'parent_item_colon' => __( 'Parent Category:', 'my-plugin' ),
        'edit_item'         => __( 'Edit Category', 'my-plugin' ),
        'update_item'       => __( 'Update Category', 'my-plugin' ),
        'add_new_item'      => __( 'Add New Category', 'my-plugin' ),
        'new_item_name'     => __( 'New Category Name', 'my-plugin' ),
        'menu_name'         => __( 'Categories', 'my-plugin' ),
    );

    $args = array(
        'hierarchical'      => true,   // true = like categories, false = like tags
        'labels'            => $labels,
        'show_ui'           => true,
        'show_admin_column' => true,
        'query_var'         => true,
        'rewrite'           => array( 'slug' => 'portfolio-category' ),
        'show_in_rest'      => true,
    );

    register_taxonomy( 'portfolio_category', array( 'portfolio_item' ), $args );
}
add_action( 'init', 'my_plugin_register_taxonomy' );
```

## Shortcodes

```php
function my_plugin_shortcode( $atts ) {
    $atts = shortcode_atts( array(
        'count' => 3,
        'type'  => 'portfolio_item',
        'class' => '',
    ), $atts, 'my_plugin' );

    $count = absint( $atts['count'] );
    $type  = sanitize_key( $atts['type'] );
    $class = sanitize_html_class( $atts['class'] );

    $query = new WP_Query( array(
        'post_type'      => $type,
        'posts_per_page' => $count,
    ) );

    ob_start();
    if ( $query->have_posts() ) :
        echo '<div class="my-plugin-grid ' . esc_attr( $class ) . '">';
        while ( $query->have_posts() ) :
            $query->the_post();
            ?>
            <div class="my-plugin-item">
                <h3><?php the_title(); ?></h3>
                <?php the_post_thumbnail( 'medium' ); ?>
                <a href="<?php the_permalink(); ?>"><?php esc_html_e( 'Read More', 'my-plugin' ); ?></a>
            </div>
            <?php
        endwhile;
        echo '</div>';
        wp_reset_postdata();
    endif;
    return ob_get_clean();
}
add_shortcode( 'my_plugin', 'my_plugin_shortcode' );
```

## REST API Custom Endpoint

```php
function my_plugin_register_rest_routes() {
    register_rest_route( 'my-plugin/v1', '/items', array(
        array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => 'my_plugin_get_items',
            'permission_callback' => '__return_true', // public
        ),
        array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'my_plugin_create_item',
            'permission_callback' => function() {
                return current_user_can( 'edit_posts' );
            },
            'args' => array(
                'title' => array(
                    'required'          => true,
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                    'validate_callback' => function( $value ) {
                        return strlen( $value ) >= 2;
                    },
                ),
            ),
        ),
    ) );

    register_rest_route( 'my-plugin/v1', '/items/(?P<id>[\d]+)', array(
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'my_plugin_get_item',
        'permission_callback' => '__return_true',
        'args' => array(
            'id' => array(
                'validate_callback' => function( $param ) {
                    return is_numeric( $param );
                },
            ),
        ),
    ) );
}
add_action( 'rest_api_init', 'my_plugin_register_rest_routes' );

function my_plugin_get_items( WP_REST_Request $request ) {
    $items = get_posts( array( 'post_type' => 'portfolio_item', 'posts_per_page' => -1 ) );
    $data  = array();
    foreach ( $items as $item ) {
        $data[] = array(
            'id'    => $item->ID,
            'title' => $item->post_title,
            'link'  => get_permalink( $item->ID ),
        );
    }
    return rest_ensure_response( $data );
}
```

## AJAX Handlers

```php
// Register AJAX actions
add_action( 'wp_ajax_my_plugin_action', 'my_plugin_ajax_handler' );
add_action( 'wp_ajax_nopriv_my_plugin_action', 'my_plugin_ajax_handler' ); // for guests

function my_plugin_ajax_handler() {
    // Verify nonce
    if ( ! check_ajax_referer( 'my_plugin_nonce', 'nonce', false ) ) {
        wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
    }

    // Get and sanitize data
    $value = sanitize_text_field( $_POST['value'] ?? '' );

    if ( empty( $value ) ) {
        wp_send_json_error( array( 'message' => 'Value is required' ) );
    }

    // Process...
    $result = array( 'processed' => $value );

    wp_send_json_success( $result );
}
```

## Options API

```php
// Get / set / delete options
$value = get_option( 'my_plugin_setting', 'default' );
update_option( 'my_plugin_setting', 'new_value' );
delete_option( 'my_plugin_setting' );

// Autoload control (false = don't load on every page)
add_option( 'my_plugin_heavy_data', $data, '', 'no' );

// Transients (cached values)
$cached = get_transient( 'my_plugin_api_data' );
if ( false === $cached ) {
    $cached = fetch_from_api(); // expensive call
    set_transient( 'my_plugin_api_data', $cached, HOUR_IN_SECONDS );
}
delete_transient( 'my_plugin_api_data' );
```

## Post Meta

```php
// Get / update / delete post meta
$value = get_post_meta( $post_id, '_my_plugin_key', true );
update_post_meta( $post_id, '_my_plugin_key', $value );
delete_post_meta( $post_id, '_my_plugin_key' );

// Get all meta for a post
$all_meta = get_post_meta( $post_id );

// Save meta in save_post hook
add_action( 'save_post', function( $post_id ) {
    if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
    if ( ! current_user_can( 'edit_post', $post_id ) ) return;
    if ( ! isset( $_POST['my_plugin_nonce'] ) ) return;
    if ( ! wp_verify_nonce( $_POST['my_plugin_nonce'], 'my_plugin_save' ) ) return;

    $value = sanitize_text_field( $_POST['my_plugin_field'] ?? '' );
    update_post_meta( $post_id, '_my_plugin_field', $value );
} );
```

## Enqueue in Admin vs Frontend

```php
// Frontend only
add_action( 'wp_enqueue_scripts', function() {
    wp_enqueue_style( 'my-plugin-public', MY_PLUGIN_URL . 'public/css/my-plugin-public.css' );
    wp_enqueue_script( 'my-plugin-public', MY_PLUGIN_URL . 'public/js/my-plugin-public.js',
        array( 'jquery' ), MY_PLUGIN_VERSION, true );
} );

// Admin only
add_action( 'admin_enqueue_scripts', function( $hook_suffix ) {
    // Only on our plugin's admin page
    if ( 'toplevel_page_my-plugin' !== $hook_suffix ) return;
    wp_enqueue_style( 'my-plugin-admin', MY_PLUGIN_URL . 'admin/css/my-plugin-admin.css' );
    wp_enqueue_script( 'my-plugin-admin', MY_PLUGIN_URL . 'admin/js/my-plugin-admin.js',
        array( 'jquery', 'wp-util' ), MY_PLUGIN_VERSION, true );
    wp_localize_script( 'my-plugin-admin', 'myPluginAdmin', array(
        'ajaxUrl' => admin_url( 'admin-ajax.php' ),
        'nonce'   => wp_create_nonce( 'my_plugin_admin_nonce' ),
    ) );
} );
```

## Common WordPress Hooks

| Hook                    | Type   | When                                  |
| ----------------------- | ------ | ------------------------------------- |
| `init`                  | action | After WordPress loads, before headers |
| `wp_loaded`             | action | After WP, plugins, theme load         |
| `wp_enqueue_scripts`    | action | Enqueue frontend assets               |
| `admin_enqueue_scripts` | action | Enqueue admin assets                  |
| `admin_menu`            | action | Register admin menu items             |
| `admin_init`            | action | Admin page initialization             |
| `save_post`             | action | When a post is saved                  |
| `the_content`           | filter | Filter post content                   |
| `the_title`             | filter | Filter post title                     |
| `wp_head`               | action | Output in <head>                      |
| `wp_footer`             | action | Output before </body>                 |
| `widgets_init`          | action | Register widget areas                 |
| `after_setup_theme`     | action | Theme setup (used in themes)          |
| `rest_api_init`         | action | Register REST routes                  |
| `template_redirect`     | action | Before template loads                 |
| `pre_get_posts`         | action | Modify WP_Query before execution      |
