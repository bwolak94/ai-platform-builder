import { nanoid } from "nanoid";
import {
  WordPressFileSchema,
  WordPressHookSchema,
  AcfFieldGroupSchema,
  WordPressCustomPostTypeSchema,
} from "@ai-builder/schemas";
import { makeEmptyWordPressProject } from "@ai-builder/serializers";
import type { WordPressProject, WordPressFile } from "@ai-builder/schemas";

type Setter = React.Dispatch<React.SetStateAction<WordPressProject>>;
type FileIdSetter = React.Dispatch<React.SetStateAction<string | null>>;
type ToolResult = Record<string, unknown>;

function makeId(prefix: string, len = 6): string {
  return `${prefix}_${nanoid(len)}`;
}

// ─── Theme boilerplate ────────────────────────────────────────────────────────

function buildThemeBoilerplate(
  name: string,
  slug: string,
  description: string,
  author: string
): WordPressFile[] {
  const textDomain = slug;

  return [
    {
      id: makeId("wpf"),
      path: "style.css",
      type: "css",
      content: `/*\nTheme Name: ${name}\nDescription: ${description || "A custom WordPress theme."}\nVersion: 1.0.0\nAuthor: ${author || "Developer"}\nText Domain: ${textDomain}\nLicense: GPL v2 or later\n*/\n`,
    },
    {
      id: makeId("wpf"),
      path: "functions.php",
      type: "php",
      content: `<?php\n/**\n * ${name} functions and definitions.\n *\n * @package ${slug}\n */\n\nif ( ! defined( 'ABSPATH' ) ) {\n\texit;\n}\n\ndefine( '${slug.toUpperCase().replace(/-/g, "_")}_VERSION', '1.0.0' );\n\n/**\n * Theme setup.\n */\nfunction ${slug.replace(/-/g, "_")}_setup() {\n\tadd_theme_support( 'title-tag' );\n\tadd_theme_support( 'post-thumbnails' );\n\tadd_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption' ) );\n\tadd_theme_support( 'automatic-feed-links' );\n\n\tregister_nav_menus( array(\n\t\t'primary' => __( 'Primary Menu', '${textDomain}' ),\n\t\t'footer'  => __( 'Footer Menu', '${textDomain}' ),\n\t) );\n\n\tload_theme_textdomain( '${textDomain}', get_template_directory() . '/languages' );\n}\nadd_action( 'after_setup_theme', '${slug.replace(/-/g, "_")}_setup' );\n\n/**\n * Enqueue scripts and styles.\n */\nfunction ${slug.replace(/-/g, "_")}_scripts() {\n\twp_enqueue_style( '${slug}-style', get_stylesheet_uri(), array(), ${slug.toUpperCase().replace(/-/g, "_")}_VERSION );\n}\nadd_action( 'wp_enqueue_scripts', '${slug.replace(/-/g, "_")}_scripts' );\n`,
    },
    {
      id: makeId("wpf"),
      path: "index.php",
      type: "php",
      content: `<?php\nget_header();\n?>\n<main id="primary" class="site-main">\n\t<?php\n\tif ( have_posts() ) :\n\t\twhile ( have_posts() ) :\n\t\t\tthe_post();\n\t\t\tget_template_part( 'template-parts/content', get_post_type() );\n\t\tendwhile;\n\t\tthe_posts_navigation();\n\telse :\n\t\tget_template_part( 'template-parts/content', 'none' );\n\tendif;\n\t?>\n</main>\n<?php\nget_footer();\n`,
    },
    {
      id: makeId("wpf"),
      path: "header.php",
      type: "php",
      content: `<!DOCTYPE html>\n<html <?php language_attributes(); ?>>\n<head>\n\t<meta charset="<?php bloginfo( 'charset' ); ?>">\n\t<meta name="viewport" content="width=device-width, initial-scale=1">\n\t<link rel="profile" href="https://gmpg.org/xfn/11">\n\t<?php wp_head(); ?>\n</head>\n<body <?php body_class(); ?>>\n<?php wp_body_open(); ?>\n<div id="page" class="site">\n\t<header id="masthead" class="site-header">\n\t\t<div class="site-branding">\n\t\t\t<?php\n\t\t\tif ( has_custom_logo() ) :\n\t\t\t\tthe_custom_logo();\n\t\t\telse :\n\t\t\t\t?><a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="site-title"><?php bloginfo( 'name' ); ?></a><?php\n\t\t\tendif;\n\t\t\t?>\n\t\t</div>\n\t\t<nav id="site-navigation" class="main-navigation">\n\t\t\t<?php\n\t\t\twp_nav_menu( array(\n\t\t\t\t'theme_location' => 'primary',\n\t\t\t\t'menu_id'        => 'primary-menu',\n\t\t\t) );\n\t\t\t?>\n\t\t</nav>\n\t</header>\n\t<div id="content" class="site-content">\n`,
    },
    {
      id: makeId("wpf"),
      path: "footer.php",
      type: "php",
      content: `\t</div><!-- #content -->\n\t<footer id="colophon" class="site-footer">\n\t\t<div class="site-info">\n\t\t\t<a href="<?php echo esc_url( __( 'https://wordpress.org/', '${textDomain}' ) ); ?>">\n\t\t\t\t<?php\n\t\t\t\t/* translators: %s: CMS name, i.e. WordPress. */\n\t\t\t\tprintf( esc_html__( 'Proudly powered by %s', '${textDomain}' ), 'WordPress' );\n\t\t\t\t?>\n\t\t\t</a>\n\t\t</div>\n\t</footer>\n</div><!-- #page -->\n<?php wp_footer(); ?>\n</body>\n</html>\n`,
    },
    {
      id: makeId("wpf"),
      path: "single.php",
      type: "php",
      content: `<?php\nget_header();\n?>\n<main id="primary" class="site-main">\n\t<?php\n\twhile ( have_posts() ) :\n\t\tthe_post();\n\t\tget_template_part( 'template-parts/content', get_post_type() );\n\t\tthe_post_navigation();\n\t\tif ( comments_open() || get_comments_number() ) :\n\t\t\tcomments_template();\n\t\tendif;\n\tendwhile;\n\t?>\n</main>\n<?php\nget_footer();\n`,
    },
    {
      id: makeId("wpf"),
      path: "page.php",
      type: "php",
      content: `<?php\nget_header();\n?>\n<main id="primary" class="site-main">\n\t<?php\n\twhile ( have_posts() ) :\n\t\tthe_post();\n\t\tget_template_part( 'template-parts/content', 'page' );\n\t\tif ( comments_open() || get_comments_number() ) :\n\t\t\tcomments_template();\n\t\tendif;\n\tendwhile;\n\t?>\n</main>\n<?php\nget_footer();\n`,
    },
    {
      id: makeId("wpf"),
      path: "template-parts/content.php",
      type: "php",
      content: `<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>\n\t<header class="entry-header">\n\t\t<?php the_title( '<h2 class="entry-title"><a href="' . esc_url( get_permalink() ) . '">', '</a></h2>' ); ?>\n\t</header>\n\t<?php if ( has_post_thumbnail() ) : ?>\n\t<div class="entry-thumbnail">\n\t\t<?php the_post_thumbnail( 'large' ); ?>\n\t</div>\n\t<?php endif; ?>\n\t<div class="entry-content">\n\t\t<?php the_excerpt(); ?>\n\t</div>\n\t<footer class="entry-footer">\n\t\t<?php echo get_the_date(); ?>\n\t</footer>\n</article>\n`,
    },
    {
      id: makeId("wpf"),
      path: "template-parts/content-none.php",
      type: "php",
      content: `<section class="no-results not-found">\n\t<header class="page-header">\n\t\t<h1 class="page-title"><?php esc_html_e( 'Nothing Found', '${textDomain}' ); ?></h1>\n\t</header>\n\t<div class="page-content">\n\t\t<p><?php esc_html_e( 'It seems we can&rsquo;t find what you&rsquo;re looking for.', '${textDomain}' ); ?></p>\n\t</div>\n</section>\n`,
    },
  ];
}

// ─── Plugin boilerplate ───────────────────────────────────────────────────────

function buildPluginBoilerplate(
  name: string,
  slug: string,
  description: string,
  author: string
): WordPressFile[] {
  const constant = slug.toUpperCase().replace(/-/g, "_");
  const className = slug
    .replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase())
    .replace(/-/g, "_");

  return [
    {
      id: makeId("wpf"),
      path: `${slug}.php`,
      type: "php",
      content: `<?php\n/**\n * Plugin Name:       ${name}\n * Description:       ${description || "A custom WordPress plugin."}\n * Version:           1.0.0\n * Author:            ${author || "Developer"}\n * Text Domain:       ${slug}\n * License:           GPL v2 or later\n */\n\nif ( ! defined( 'ABSPATH' ) ) {\n\texit;\n}\n\ndefine( '${constant}_VERSION', '1.0.0' );\ndefine( '${constant}_FILE', __FILE__ );\ndefine( '${constant}_DIR', plugin_dir_path( __FILE__ ) );\ndefine( '${constant}_URL', plugin_dir_url( __FILE__ ) );\n\nrequire_once ${constant}_DIR . 'includes/class-${slug}.php';\n\nregister_activation_hook( __FILE__, array( '${className}_Activator', 'activate' ) );\nregister_deactivation_hook( __FILE__, array( '${className}_Deactivator', 'deactivate' ) );\n\n$plugin = new ${className}();\n$plugin->run();\n`,
    },
    {
      id: makeId("wpf"),
      path: `includes/class-${slug}.php`,
      type: "php",
      content: `<?php\n\nif ( ! defined( 'ABSPATH' ) ) {\n\texit;\n}\n\nclass ${className} {\n\n\tpublic function run() {\n\t\t$this->define_public_hooks();\n\t\t$this->define_admin_hooks();\n\t}\n\n\tprivate function define_public_hooks() {\n\t\tadd_action( 'wp_enqueue_scripts', array( $this, 'enqueue_styles' ) );\n\t\tadd_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ) );\n\t}\n\n\tprivate function define_admin_hooks() {\n\t\tadd_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_styles' ) );\n\t\tadd_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_scripts' ) );\n\t}\n\n\tpublic function enqueue_styles() {\n\t\twp_enqueue_style( '${slug}', ${constant}_URL . 'public/css/${slug}-public.css', array(), ${constant}_VERSION );\n\t}\n\n\tpublic function enqueue_scripts() {\n\t\twp_enqueue_script( '${slug}', ${constant}_URL . 'public/js/${slug}-public.js', array( 'jquery' ), ${constant}_VERSION, true );\n\t}\n\n\tpublic function enqueue_admin_styles() {\n\t\twp_enqueue_style( '${slug}-admin', ${constant}_URL . 'admin/css/${slug}-admin.css', array(), ${constant}_VERSION );\n\t}\n\n\tpublic function enqueue_admin_scripts() {\n\t\twp_enqueue_script( '${slug}-admin', ${constant}_URL . 'admin/js/${slug}-admin.js', array( 'jquery' ), ${constant}_VERSION, true );\n\t}\n}\n\nclass ${className}_Activator {\n\tpublic static function activate() {\n\t\tflush_rewrite_rules();\n\t}\n}\n\nclass ${className}_Deactivator {\n\tpublic static function deactivate() {\n\t\tflush_rewrite_rules();\n\t}\n}\n`,
    },
    {
      id: makeId("wpf"),
      path: `public/css/${slug}-public.css`,
      type: "css",
      content: `/* ${name} - Public Styles */\n`,
    },
    {
      id: makeId("wpf"),
      path: `public/js/${slug}-public.js`,
      type: "js",
      content: `(function($) {\n\t'use strict';\n\n\t$(document).ready(function() {\n\t\t// ${name} public scripts\n\t});\n\n})(jQuery);\n`,
    },
    {
      id: makeId("wpf"),
      path: `admin/css/${slug}-admin.css`,
      type: "css",
      content: `/* ${name} - Admin Styles */\n`,
    },
    {
      id: makeId("wpf"),
      path: `admin/js/${slug}-admin.js`,
      type: "js",
      content: `(function($) {\n\t'use strict';\n\n\t$(document).ready(function() {\n\t\t// ${name} admin scripts\n\t});\n\n})(jQuery);\n`,
    },
    {
      id: makeId("wpf"),
      path: "readme.txt",
      type: "txt",
      content: `=== ${name} ===\nContributors: ${(author || "developer").toLowerCase()}\nTags: custom\nRequires at least: 5.8\nTested up to: 6.6\nStable tag: 1.0.0\nLicense: GPLv2 or later\nLicense URI: https://www.gnu.org/licenses/gpl-2.0.html\n\n${description || "A custom WordPress plugin."}\n\n== Description ==\n\n${description || "A custom WordPress plugin."}\n\n== Installation ==\n\n1. Upload the plugin files to the \`/wp-content/plugins/${slug}\` directory.\n2. Activate the plugin through the 'Plugins' screen in WordPress.\n\n== Changelog ==\n\n= 1.0.0 =\n* Initial release.\n`,
    },
  ];
}

// ─── Tool handlers ────────────────────────────────────────────────────────────

export function useWordPressTools(
  project: WordPressProject,
  setProject: Setter,
  setActiveFileId: FileIdSetter
) {
  return {
    queryProject: (): Promise<{
      project: Omit<WordPressProject, "files"> & { filePaths: string[] };
    }> =>
      Promise.resolve({
        project: {
          ...project,
          files: undefined as never,
          filePaths: project.files.map((f) => f.path),
        },
      }),

    initProject: ({
      projectType,
      name,
      slug,
      description = "",
      author = "",
    }: {
      projectType: "theme" | "plugin";
      name: string;
      slug: string;
      description?: string;
      author?: string;
    }): Promise<ToolResult> => {
      const empty = makeEmptyWordPressProject(projectType);
      const files =
        projectType === "theme"
          ? buildThemeBoilerplate(name, slug, description, author)
          : buildPluginBoilerplate(name, slug, description, author);

      setProject({
        ...empty,
        projectType,
        name,
        slug,
        description,
        author,
        files,
      });

      if (files[0]) setActiveFileId(files[0].id);

      return Promise.resolve({ success: true, fileCount: files.length });
    },

    addFile: ({ file }: { file: unknown }): Promise<ToolResult> => {
      const parsed = WordPressFileSchema.safeParse(file);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });

      // Prevent duplicate paths
      if (project.files.some((f) => f.path === parsed.data.path)) {
        return Promise.resolve({ error: `File already exists: ${parsed.data.path}` });
      }

      setProject((prev) => ({ ...prev, files: [...prev.files, parsed.data] }));
      setActiveFileId(parsed.data.id);
      return Promise.resolve({ success: true, fileId: parsed.data.id });
    },

    updateFile: ({ fileId, content }: { fileId: string; content: string }): Promise<ToolResult> => {
      const idx = project.files.findIndex((f) => f.id === fileId);
      if (idx === -1) return Promise.resolve({ error: `File not found: ${fileId}` });

      setProject((prev) => ({
        ...prev,
        files: prev.files.map((f) => (f.id === fileId ? { ...f, content } : f)),
      }));
      return Promise.resolve({ success: true });
    },

    removeFile: ({ fileId }: { fileId: string }): Promise<ToolResult> => {
      setProject((prev) => ({
        ...prev,
        files: prev.files.filter((f) => f.id !== fileId),
      }));
      return Promise.resolve({ success: true });
    },

    addHook: ({ hook }: { hook: unknown }): Promise<ToolResult> => {
      const parsed = WordPressHookSchema.safeParse(hook);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });

      // Verify the fileId exists
      const file = project.files.find((f) => f.id === parsed.data.fileId);
      if (!file) return Promise.resolve({ error: `File not found: ${parsed.data.fileId}` });

      // Append the hook registration code to the file
      const hookCode = `\nadd_${parsed.data.hookType}( '${parsed.data.hookName}', '${parsed.data.callbackFn}', ${String(parsed.data.priority)} );\n\nfunction ${parsed.data.callbackFn}() {\n\t// TODO: implement ${parsed.data.hookName} handler\n}\n`;

      setProject((prev) => ({
        ...prev,
        files: prev.files.map((f) =>
          f.id === parsed.data.fileId ? { ...f, content: f.content + hookCode } : f
        ),
        hooks: [...prev.hooks, parsed.data],
      }));

      return Promise.resolve({ success: true });
    },

    addAcfFieldGroup: ({ group }: { group: unknown }): Promise<ToolResult> => {
      const parsed = AcfFieldGroupSchema.safeParse(group);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });

      // Generate the PHP code for this field group
      const fieldsPhp = parsed.data.fields
        .map(
          (f) =>
            `\t\t\tarray(\n\t\t\t\t'key'      => '${f.key}',\n\t\t\t\t'label'    => '${f.label}',\n\t\t\t\t'name'     => '${f.name}',\n\t\t\t\t'type'     => '${f.type}',\n\t\t\t\t'required' => ${f.required ? "1" : "0"},\n\t\t\t),`
        )
        .join("\n");

      const locationPhp =
        parsed.data.locationPostType.length > 0
          ? parsed.data.locationPostType
              .map(
                (pt) =>
                  `\t\t\tarray(\n\t\t\t\tarray(\n\t\t\t\t\t'param'    => 'post_type',\n\t\t\t\t\t'operator' => '==',\n\t\t\t\t\t'value'    => '${pt}',\n\t\t\t\t),\n\t\t\t),`
              )
              .join("\n")
          : "\t\t\tarray( array( 'param' => 'post_type', 'operator' => '==', 'value' => 'page' ) ),";

      const phpCode = `\nif ( function_exists( 'acf_add_local_field_group' ) ) {\n\tacf_add_local_field_group( array(\n\t\t'key'      => '${parsed.data.key}',\n\t\t'title'    => '${parsed.data.title}',\n\t\t'fields'   => array(\n${fieldsPhp}\n\t\t),\n\t\t'location' => array(\n${locationPhp}\n\t\t),\n\t) );\n}\n`;

      // Find or create the ACF file
      let acfFile = project.files.find((f) => f.path.includes("acf"));
      if (!acfFile) {
        const acfPath =
          project.projectType === "theme" ? "inc/acf-fields.php" : "includes/acf-fields.php";
        const newAcfFile = {
          id: makeId("wpf"),
          path: acfPath,
          type: "php" as const,
          content: "<?php\n",
        };
        acfFile = newAcfFile;
        setProject((prev) => ({
          ...prev,
          files: [...prev.files, { ...newAcfFile, content: newAcfFile.content + phpCode }],
          acfGroups: [...prev.acfGroups, parsed.data],
        }));
      } else {
        const acfFileId = acfFile.id;
        setProject((prev) => ({
          ...prev,
          files: prev.files.map((f) =>
            f.id === acfFileId ? { ...f, content: f.content + phpCode } : f
          ),
          acfGroups: [...prev.acfGroups, parsed.data],
        }));
      }

      return Promise.resolve({ success: true, groupId: parsed.data.id });
    },

    generateCustomPostType: ({ cpt }: { cpt: unknown }): Promise<ToolResult> => {
      const parsed = WordPressCustomPostTypeSchema.safeParse(cpt);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });

      const supportsPhp = parsed.data.supports.map((s) => `'${s}'`).join(", ");

      const phpCode = `\nfunction register_cpt_${parsed.data.slug}() {\n\t$labels = array(\n\t\t'name'          => _x( '${parsed.data.plural}', 'post type general name', 'textdomain' ),\n\t\t'singular_name' => _x( '${parsed.data.singular}', 'post type singular name', 'textdomain' ),\n\t\t'add_new_item'  => __( 'Add New ${parsed.data.singular}', 'textdomain' ),\n\t\t'edit_item'     => __( 'Edit ${parsed.data.singular}', 'textdomain' ),\n\t\t'not_found'     => __( 'No ${parsed.data.plural.toLowerCase()} found.', 'textdomain' ),\n\t);\n\tregister_post_type( '${parsed.data.slug}', array(\n\t\t'labels'      => $labels,\n\t\t'public'      => ${parsed.data.public ? "true" : "false"},\n\t\t'has_archive' => ${parsed.data.hasArchive ? "true" : "false"},\n\t\t'supports'    => array( ${supportsPhp} ),\n\t\t'menu_icon'   => '${parsed.data.icon}',\n\t\t'rewrite'     => array( 'slug' => '${parsed.data.slug.replace(/_/g, "-")}' ),\n\t\t'show_in_rest' => true,\n\t) );\n}\nadd_action( 'init', 'register_cpt_${parsed.data.slug}' );\n`;

      // Add to functions.php or a CPT file
      const cptFile = project.files.find(
        (f) => f.path === "inc/custom-post-types.php" || f.path === "includes/custom-post-types.php"
      );
      const fnFile = project.files.find((f) => f.path === "functions.php");
      const targetId = cptFile?.id ?? fnFile?.id;

      if (!targetId)
        return Promise.resolve({ error: "No functions.php found. Call initProject first." });

      setProject((prev) => ({
        ...prev,
        files: prev.files.map((f) =>
          f.id === targetId ? { ...f, content: f.content + phpCode } : f
        ),
        customPostTypes: [...prev.customPostTypes, parsed.data],
      }));

      return Promise.resolve({ success: true });
    },

    generateTaxonomy: ({
      slug,
      singular,
      plural,
      postTypes,
      hierarchical = true,
    }: {
      slug: string;
      singular: string;
      plural: string;
      postTypes: string[];
      hierarchical?: boolean;
    }): Promise<ToolResult> => {
      const postTypesPhp = postTypes.map((pt) => `'${pt}'`).join(", ");
      const phpCode = `\nfunction register_tax_${slug}() {\n\tregister_taxonomy( '${slug}', array( ${postTypesPhp} ), array(\n\t\t'labels'            => array(\n\t\t\t'name'          => _x( '${plural}', 'taxonomy general name', 'textdomain' ),\n\t\t\t'singular_name' => _x( '${singular}', 'taxonomy singular name', 'textdomain' ),\n\t\t),\n\t\t'hierarchical'      => ${hierarchical ? "true" : "false"},\n\t\t'show_ui'           => true,\n\t\t'show_admin_column' => true,\n\t\t'rewrite'           => array( 'slug' => '${slug.replace(/_/g, "-")}' ),\n\t\t'show_in_rest'      => true,\n\t) );\n}\nadd_action( 'init', 'register_tax_${slug}' );\n`;

      const fnFile = project.files.find(
        (f) => f.path === "functions.php" || f.path.endsWith("custom-post-types.php")
      );
      if (!fnFile) return Promise.resolve({ error: "No functions.php found." });

      setProject((prev) => ({
        ...prev,
        files: prev.files.map((f) =>
          f.id === fnFile.id ? { ...f, content: f.content + phpCode } : f
        ),
      }));

      return Promise.resolve({ success: true });
    },

    addEnqueue: ({
      handle,
      assetType,
      filePath,
      deps = [],
      inFooter = true,
      context = "frontend",
    }: {
      handle: string;
      assetType: "style" | "script";
      filePath: string;
      deps?: string[];
      inFooter?: boolean;
      context?: "frontend" | "admin" | "both";
    }): Promise<ToolResult> => {
      const depsPhp =
        deps.length > 0 ? `array( ${deps.map((d) => `'${d}'`).join(", ")} )` : "array()";
      const assetUrl =
        project.projectType === "theme"
          ? `get_template_directory_uri() . '/${filePath}'`
          : `${project.slug.toUpperCase().replace(/-/g, "_")}_URL . '${filePath}'`;

      const enqueueFn =
        assetType === "style"
          ? `wp_enqueue_style( '${handle}', ${assetUrl}, ${depsPhp}, '1.0.0' );`
          : `wp_enqueue_script( '${handle}', ${assetUrl}, ${depsPhp}, '1.0.0', ${inFooter ? "true" : "false"} );`;

      const hookName = context === "admin" ? "admin_enqueue_scripts" : "wp_enqueue_scripts";
      const callback = `${project.slug.replace(/-/g, "_")}_enqueue_${handle.replace(/-/g, "_")}`;
      const phpCode = `\nfunction ${callback}() {\n\t${enqueueFn}\n}\nadd_action( '${hookName}', '${callback}' );\n`;

      const fnFile = project.files.find((f) => f.path === "functions.php");
      if (!fnFile) return Promise.resolve({ error: "No functions.php found." });

      setProject((prev) => ({
        ...prev,
        files: prev.files.map((f) =>
          f.id === fnFile.id ? { ...f, content: f.content + phpCode } : f
        ),
      }));

      return Promise.resolve({ success: true });
    },

    generateShortcode: ({
      tag,
      description,
      attributes = [],
    }: {
      tag: string;
      description: string;
      attributes?: { name: string; default: string; description: string }[];
    }): Promise<ToolResult> => {
      const attrsDefault = attributes
        .map((a) => `\t\t'${a.name}' => '${a.default}', // ${a.description}`)
        .join("\n");

      const phpCode = `\n/**\n * Shortcode: [${tag}]\n * ${description}\n */\nfunction shortcode_${tag}( $atts ) {\n\t$atts = shortcode_atts( array(\n${attrsDefault || "\t\t// no attributes"}\n\t), $atts, '${tag}' );\n\n\tob_start();\n\t// TODO: render shortcode output\n\t?><div class="${tag.replace(/_/g, "-")}">\n\t\t<!-- Shortcode: ${tag} -->\n\t</div><?php\n\treturn ob_get_clean();\n}\nadd_shortcode( '${tag}', 'shortcode_${tag}' );\n`;

      const fnFile = project.files.find((f) => f.path === "functions.php");
      if (!fnFile) return Promise.resolve({ error: "No functions.php found." });

      setProject((prev) => ({
        ...prev,
        files: prev.files.map((f) =>
          f.id === fnFile.id ? { ...f, content: f.content + phpCode } : f
        ),
      }));

      return Promise.resolve({ success: true });
    },

    generateWidgetArea: ({
      id,
      name,
      description = "",
    }: {
      id: string;
      name: string;
      description?: string;
    }): Promise<ToolResult> => {
      const phpCode = `\nfunction register_widget_${id.replace(/-/g, "_")}() {\n\tregister_sidebar( array(\n\t\t'name'          => __( '${name}', 'textdomain' ),\n\t\t'id'            => '${id}',\n\t\t'description'   => __( '${description}', 'textdomain' ),\n\t\t'before_widget' => '<section id="%1$s" class="widget %2$s">',\n\t\t'after_widget'  => '</section>',\n\t\t'before_title'  => '<h2 class="widget-title">',\n\t\t'after_title'   => '</h2>',\n\t) );\n}\nadd_action( 'widgets_init', 'register_widget_${id.replace(/-/g, "_")}' );\n`;

      const fnFile = project.files.find((f) => f.path === "functions.php");
      if (!fnFile) return Promise.resolve({ error: "No functions.php found." });

      setProject((prev) => ({
        ...prev,
        files: prev.files.map((f) =>
          f.id === fnFile.id ? { ...f, content: f.content + phpCode } : f
        ),
      }));

      return Promise.resolve({ success: true });
    },

    addThemeSupport: ({
      feature,
      args,
    }: {
      feature: string;
      args?: Record<string, unknown>;
    }): Promise<ToolResult> => {
      const argsPhp = args
        ? `, array(\n${Object.entries(args)
            .map(([k, v]) => `\t\t'${k}' => ${typeof v === "string" ? `'${v}'` : String(v)}`)
            .join(",\n")}\n\t)`
        : "";
      const phpCode = `\tadd_theme_support( '${feature}'${argsPhp} );\n`;

      const fnFile = project.files.find((f) => f.path === "functions.php");
      if (!fnFile) return Promise.resolve({ error: "No functions.php found." });

      // Insert inside after_setup_theme function before the closing brace
      const updated = fnFile.content.replace(
        /(add_action\( 'after_setup_theme')/,
        `${phpCode}\nadd_action( 'after_setup_theme'`
      );

      setProject((prev) => ({
        ...prev,
        files: prev.files.map((f) => (f.id === fnFile.id ? { ...f, content: updated } : f)),
      }));

      return Promise.resolve({ success: true });
    },

    generateRestEndpoint: ({
      namespace,
      route,
      methods,
      requireAuth = false,
      args = [],
    }: {
      namespace: string;
      route: string;
      methods: string[];
      requireAuth?: boolean;
      args?: { name: string; type: string; required: boolean }[];
    }): Promise<ToolResult> => {
      const methodConst =
        methods.length === 1
          ? methods[0] === "GET"
            ? "WP_REST_Server::READABLE"
            : methods[0] === "POST"
              ? "WP_REST_Server::CREATABLE"
              : `'${methods.join(", ")}'`
          : `'${methods.join(", ")}'`;

      const permCallback = requireAuth
        ? `function() { return current_user_can( 'edit_posts' ); }`
        : `'__return_true'`;

      const argsPhp = args
        .map(
          (a) =>
            `\t\t\t'${a.name}' => array(\n\t\t\t\t'required' => ${a.required ? "true" : "false"},\n\t\t\t\t'type'     => '${a.type}',\n\t\t\t),`
        )
        .join("\n");

      const callbackName = `rest_${namespace.replace(/[^a-z0-9]/g, "_")}_handler`;

      const phpCode = `\nfunction register_rest_${callbackName}() {\n\tregister_rest_route( '${namespace}', '${route}', array(\n\t\t'methods'             => ${methodConst},\n\t\t'callback'            => '${callbackName}',\n\t\t'permission_callback' => ${permCallback},\n\t\t'args'                => array(\n${argsPhp}\n\t\t),\n\t) );\n}\nadd_action( 'rest_api_init', 'register_rest_${callbackName}' );\n\nfunction ${callbackName}( WP_REST_Request $request ) {\n\t// TODO: implement REST endpoint\n\treturn rest_ensure_response( array( 'success' => true ) );\n}\n`;

      const fnFile = project.files.find((f) => f.path === "functions.php");
      const mainFile = project.files.find((f) => f.path === `${project.slug}.php`);
      const targetId = fnFile?.id ?? mainFile?.id;
      if (!targetId) return Promise.resolve({ error: "No main file found." });

      setProject((prev) => ({
        ...prev,
        files: prev.files.map((f) =>
          f.id === targetId ? { ...f, content: f.content + phpCode } : f
        ),
      }));

      return Promise.resolve({ success: true });
    },

    addCustomImageSize: ({
      slug,
      width,
      height,
      crop = true,
      label,
    }: {
      slug: string;
      width: number;
      height: number;
      crop?: boolean;
      label: string;
    }): Promise<ToolResult> => {
      const phpCode = `\nadd_image_size( '${slug}', ${String(width)}, ${String(height)}, ${crop ? "true" : "false"} );\n\nadd_filter( 'image_size_names_choose', function( $sizes ) {\n\treturn array_merge( $sizes, array( '${slug}' => __( '${label}', 'textdomain' ) ) );\n} );\n`;

      const fnFile = project.files.find((f) => f.path === "functions.php");
      if (!fnFile) return Promise.resolve({ error: "No functions.php found." });

      setProject((prev) => ({
        ...prev,
        files: prev.files.map((f) =>
          f.id === fnFile.id ? { ...f, content: f.content + phpCode } : f
        ),
      }));

      return Promise.resolve({ success: true });
    },

    generateAcfBlock: ({
      blockName,
      title,
      description = "",
      icon = "layout",
      category = "layout",
      keywords = [],
    }: {
      blockName: string;
      title: string;
      description?: string;
      icon?: string;
      category?: string;
      keywords?: string[];
    }): Promise<ToolResult> => {
      const keywordsPhp = keywords.map((k) => `'${k}'`).join(", ");
      const templatePath = `template-parts/blocks/${blockName}.php`;

      const phpCode = `\nif ( function_exists( 'acf_register_block_type' ) ) {\n\tadd_action( 'acf/init', function() {\n\t\tacf_register_block_type( array(\n\t\t\t'name'            => '${blockName}',\n\t\t\t'title'           => __( '${title}', 'textdomain' ),\n\t\t\t'description'     => __( '${description}', 'textdomain' ),\n\t\t\t'render_template' => get_template_directory() . '/${templatePath}',\n\t\t\t'category'        => '${category}',\n\t\t\t'icon'            => '${icon}',\n\t\t\t'keywords'        => array( ${keywordsPhp} ),\n\t\t\t'supports'        => array( 'align' => array( 'wide', 'full' ) ),\n\t\t) );\n\t} );\n}\n`;

      const blockTemplate = `<?php\n/**\n * Block: ${title}\n */\n$classes = 'wp-block-${blockName}';\nif ( ! empty( $block['className'] ) ) $classes .= ' ' . $block['className'];\nif ( ! empty( $block['align'] ) ) $classes .= ' align' . $block['align'];\n?>\n<div id="<?php echo esc_attr( $block['id'] ?? '' ); ?>" class="<?php echo esc_attr( $classes ); ?>">\n\t<!-- TODO: render ${title} block fields -->\n\t<?php\n\t// Example: $heading = get_field( 'heading' );\n\t// echo '<h2>' . esc_html( $heading ) . '</h2>';\n\t?>\n</div>\n`;

      const fnFile = project.files.find((f) => f.path === "functions.php");
      if (!fnFile) return Promise.resolve({ error: "No functions.php found." });

      const newBlockFile: WordPressFile = {
        id: makeId("wpf"),
        path: templatePath,
        type: "php",
        content: blockTemplate,
      };

      setProject((prev) => ({
        ...prev,
        files: [
          ...prev.files.map((f) =>
            f.id === fnFile.id ? { ...f, content: f.content + phpCode } : f
          ),
          newBlockFile,
        ],
      }));

      return Promise.resolve({ success: true, templatePath });
    },

    retrieveDocs: (): Promise<ToolResult> =>
      Promise.resolve({ message: "Documentation retrieved — see agent response." }),
  };
}
