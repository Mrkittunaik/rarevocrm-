<?php
/**
 * Plugin Name: RAREVO CRM Connector
 * Description: Sends website form submissions, new user sign-ups and WooCommerce customers to your RAREVO CRM sheet. Can also import all existing users/customers.
 * Version: 1.0.0
 * Author: RAREVO MEDIA
 * License: GPL-2.0-or-later
 * Text Domain: rarevo-crm
 */

if (!defined('ABSPATH')) exit;

class Rarevo_CRM_Connector {
    const OPT = 'rarevo_crm_settings';

    public static function init() {
        add_action('admin_menu', [__CLASS__, 'menu']);
        add_action('admin_init', [__CLASS__, 'register']);
        add_action('admin_post_rarevo_crm_sync', [__CLASS__, 'sync_existing']);
        add_action('admin_post_rarevo_crm_test', [__CLASS__, 'send_test']);
        add_action('wp_footer', [__CLASS__, 'embed_script']);

        $o = self::opts();
        if (!empty($o['users'])) add_action('user_register', [__CLASS__, 'on_user_register'], 20, 1);
        if (!empty($o['woo'])) {
            add_action('woocommerce_created_customer', [__CLASS__, 'on_user_register'], 20, 1);
            add_action('woocommerce_checkout_order_processed', [__CLASS__, 'on_order'], 20, 1);
        }
        if (!empty($o['forms'])) {
            add_action('wpcf7_mail_sent', [__CLASS__, 'on_cf7'], 20, 1);                               // Contact Form 7
            add_action('wpforms_process_complete', [__CLASS__, 'on_wpforms'], 20, 4);                  // WPForms
            add_action('elementor_pro/forms/new_record', [__CLASS__, 'on_elementor'], 20, 2);          // Elementor Pro forms
            add_action('gform_after_submission', [__CLASS__, 'on_gravity'], 20, 2);                   // Gravity Forms
            add_action('fluentform/submission_inserted', [__CLASS__, 'on_fluent'], 20, 3);             // Fluent Forms
        }
    }

    public static function opts() {
        return wp_parse_args(get_option(self::OPT, []), ['url' => '', 'key' => '', 'users' => 1, 'woo' => 1, 'forms' => 1, 'embed' => 0]);
    }

    /* ---------------- sending ---------------- */
    private static function endpoint($bulk = false) {
        $o = self::opts();
        if (empty($o['url']) || empty($o['key'])) return '';
        return rtrim($o['url'], '/') . '/api/collect/' . rawurlencode($o['key']) . ($bulk ? '/bulk' : '');
    }
    public static function post($payload, $bulk = false, $blocking = false) {
        $url = self::endpoint($bulk);
        if (!$url) return new WP_Error('rarevo_crm', 'CRM URL or website key is missing');
        return wp_remote_post($url, [
            'timeout'  => $bulk ? 45 : 8,
            'blocking' => $blocking,
            'headers'  => ['Content-Type' => 'application/json'],
            'body'     => wp_json_encode($payload),
        ]);
    }
    private static function send_fields($fields, $form, $kind = 'form', $ref = '') {
        $fields = array_filter(array_map(function ($v) { return is_array($v) ? implode(', ', array_map('strval', $v)) : trim((string) $v); }, (array) $fields), 'strlen');
        if (!$fields) return;
        $payload = ['fields' => $fields, 'form' => $form, 'kind' => $kind, 'source' => 'Website', 'page' => wp_get_referer() ? wp_get_referer() : home_url('/')];
        if ($ref) $payload['ref'] = $ref;
        self::post($payload);
    }
    private static function user_item($user_id) {
        $u = get_userdata($user_id);
        if (!$u) return null;
        $first = get_user_meta($user_id, 'first_name', true) ?: get_user_meta($user_id, 'billing_first_name', true);
        $last  = get_user_meta($user_id, 'last_name', true) ?: get_user_meta($user_id, 'billing_last_name', true);
        $name  = trim($first . ' ' . $last) ?: $u->display_name;
        $fields = [
            'Name'        => $name,
            'Email'       => $u->user_email,
            'Phone'       => get_user_meta($user_id, 'billing_phone', true),
            'City'        => get_user_meta($user_id, 'billing_city', true),
            'Company'     => get_user_meta($user_id, 'billing_company', true),
            'User role'   => implode(', ', (array) $u->roles),
            'Registered'  => $u->user_registered,
        ];
        return ['kind' => 'user', 'ref' => 'wp:user:' . $user_id, 'fields' => array_filter($fields, 'strlen'), 'form' => 'Website sign-up', 'added' => $u->user_registered ? strtotime($u->user_registered) * 1000 : null];
    }

    /* ---------------- hooks ---------------- */
    public static function on_user_register($user_id) {
        $item = self::user_item($user_id);
        if ($item) self::post($item);
    }
    public static function on_order($order_id) {
        if (!function_exists('wc_get_order')) return;
        $o = wc_get_order($order_id);
        if (!$o) return;
        $items = [];
        foreach ($o->get_items() as $it) $items[] = $it->get_name() . ' × ' . $it->get_quantity();
        self::send_fields([
            'Name'          => trim($o->get_billing_first_name() . ' ' . $o->get_billing_last_name()),
            'Email'         => $o->get_billing_email(),
            'Phone'         => $o->get_billing_phone(),
            'City'          => $o->get_billing_city(),
            'Order number'  => $o->get_order_number(),
            'Order total'   => $o->get_total(),
            'Products'      => implode('; ', $items),
        ], 'WooCommerce order', 'order', $o->get_customer_id() ? 'wp:user:' . $o->get_customer_id() : '');
    }
    public static function on_cf7($contact_form) {
        if (!class_exists('WPCF7_Submission')) return;
        $sub = WPCF7_Submission::get_instance();
        if (!$sub) return;
        $data = $sub->get_posted_data();
        $fields = [];
        foreach ((array) $data as $k => $v) { if (strpos($k, '_') === 0) continue; $fields[self::nice($k)] = $v; }
        self::send_fields($fields, $contact_form->title());
    }
    public static function on_wpforms($fields_in, $entry, $form_data, $entry_id) {
        $fields = [];
        foreach ((array) $fields_in as $f) { if (!empty($f['name'])) $fields[$f['name']] = isset($f['value']) ? $f['value'] : ''; }
        self::send_fields($fields, isset($form_data['settings']['form_title']) ? $form_data['settings']['form_title'] : 'WPForms');
    }
    public static function on_elementor($record, $handler) {
        $raw = $record->get('fields');
        $fields = [];
        foreach ((array) $raw as $id => $f) { $fields[!empty($f['title']) ? $f['title'] : self::nice($id)] = isset($f['value']) ? $f['value'] : ''; }
        self::send_fields($fields, $record->get_form_settings('form_name') ?: 'Elementor form');
    }
    public static function on_gravity($entry, $form) {
        $fields = [];
        foreach ((array) $form['fields'] as $f) {
            $label = is_object($f) ? $f->label : (isset($f['label']) ? $f['label'] : '');
            $id = is_object($f) ? $f->id : (isset($f['id']) ? $f['id'] : '');
            $val = function_exists('rgar') ? rgar($entry, (string) $id) : (isset($entry[$id]) ? $entry[$id] : '');
            if ($label !== '') $fields[$label] = $val;
        }
        self::send_fields($fields, isset($form['title']) ? $form['title'] : 'Gravity form');
    }
    public static function on_fluent($entry_id, $form_data, $form) {
        $fields = [];
        foreach ((array) $form_data as $k => $v) { if (strpos($k, '_') === 0) continue; if (is_array($v) && isset($v['first_name'])) $v = trim(implode(' ', array_filter([$v['first_name'] ?? '', $v['last_name'] ?? '']))); $fields[self::nice($k)] = $v; }
        self::send_fields($fields, is_object($form) && isset($form->title) ? $form->title : 'Fluent form');
    }
    private static function nice($k) { return ucfirst(trim(preg_replace('/[_\-]+/', ' ', preg_replace('/^your[-_]/', '', (string) $k)))); }

    public static function embed_script() {
        $o = self::opts();
        if (empty($o['embed']) || empty($o['url']) || empty($o['key']) || is_admin()) return;
        printf('<script src="%s" data-key="%s" async></script>' . "\n", esc_url(rtrim($o['url'], '/') . '/embed.js'), esc_attr($o['key']));
    }

    /* ---------------- admin ---------------- */
    public static function menu() {
        add_options_page('RAREVO CRM', 'RAREVO CRM', 'manage_options', 'rarevo-crm', [__CLASS__, 'page']);
    }
    public static function register() {
        register_setting('rarevo_crm', self::OPT, ['sanitize_callback' => function ($in) {
            return [
                'url'   => esc_url_raw(trim($in['url'] ?? '')),
                'key'   => sanitize_text_field($in['key'] ?? ''),
                'users' => empty($in['users']) ? 0 : 1,
                'woo'   => empty($in['woo']) ? 0 : 1,
                'forms' => empty($in['forms']) ? 0 : 1,
                'embed' => empty($in['embed']) ? 0 : 1,
            ];
        }]);
    }
    public static function page() {
        if (!current_user_can('manage_options')) return;
        $o = self::opts();
        $msg = isset($_GET['rarevo_msg']) ? sanitize_text_field(wp_unslash($_GET['rarevo_msg'])) : '';
        ?>
        <div class="wrap">
            <h1>RAREVO CRM Connector</h1>
            <?php if ($msg) : ?><div class="notice notice-info"><p><?php echo esc_html($msg); ?></p></div><?php endif; ?>
            <p>Copy the <b>CRM address</b> and <b>website key</b> from your CRM: open the business → <b>Website &amp; forms</b>.</p>
            <form method="post" action="options.php">
                <?php settings_fields('rarevo_crm'); ?>
                <table class="form-table" role="presentation">
                    <tr><th scope="row"><label for="rc_url">CRM address</label></th><td><input id="rc_url" class="regular-text" name="<?php echo esc_attr(self::OPT); ?>[url]" value="<?php echo esc_attr($o['url']); ?>" placeholder="https://crm.yourdomain.com"></td></tr>
                    <tr><th scope="row"><label for="rc_key">Website key</label></th><td><input id="rc_key" class="regular-text" name="<?php echo esc_attr(self::OPT); ?>[key]" value="<?php echo esc_attr($o['key']); ?>" placeholder="wk_..."></td></tr>
                    <tr><th scope="row">Send to CRM</th><td>
                        <label><input type="checkbox" name="<?php echo esc_attr(self::OPT); ?>[forms]" value="1" <?php checked($o['forms']); ?>> Form submissions (Contact Form 7, WPForms, Elementor, Gravity Forms, Fluent Forms)</label><br>
                        <label><input type="checkbox" name="<?php echo esc_attr(self::OPT); ?>[users]" value="1" <?php checked($o['users']); ?>> New user sign-ups</label><br>
                        <label><input type="checkbox" name="<?php echo esc_attr(self::OPT); ?>[woo]" value="1" <?php checked($o['woo']); ?>> WooCommerce customers and orders</label><br>
                        <label><input type="checkbox" name="<?php echo esc_attr(self::OPT); ?>[embed]" value="1" <?php checked($o['embed']); ?>> Also capture any other HTML form on the site (adds the CRM script to every page)</label>
                    </td></tr>
                </table>
                <?php submit_button('Save settings'); ?>
            </form>
            <hr>
            <h2>Existing users and customers</h2>
            <p>Send everyone who already has an account on this website to the CRM. People already in the CRM are updated, not duplicated.</p>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="display:inline-block;margin-right:8px">
                <?php wp_nonce_field('rarevo_crm_sync'); ?><input type="hidden" name="action" value="rarevo_crm_sync">
                <?php submit_button('Sync existing users now', 'primary', 'submit', false); ?>
            </form>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="display:inline-block">
                <?php wp_nonce_field('rarevo_crm_test'); ?><input type="hidden" name="action" value="rarevo_crm_test">
                <?php submit_button('Send a test lead', 'secondary', 'submit', false); ?>
            </form>
        </div>
        <?php
    }
    private static function back($msg) {
        wp_safe_redirect(add_query_arg(['page' => 'rarevo-crm', 'rarevo_msg' => rawurlencode($msg)], admin_url('options-general.php')));
        exit;
    }
    private static function result_msg($res, $ok_prefix) {
        if (is_wp_error($res)) return 'Could not reach the CRM: ' . $res->get_error_message();
        $code = wp_remote_retrieve_response_code($res);
        $body = json_decode(wp_remote_retrieve_body($res), true);
        if ($code !== 200) return 'CRM answered ' . $code . ': ' . (isset($body['error']) ? $body['error'] : 'unknown error');
        return $ok_prefix . sprintf(' — %d added, %d updated.', $body['created'] ?? 0, $body['updated'] ?? 0);
    }
    public static function send_test() {
        if (!current_user_can('manage_options') || !check_admin_referer('rarevo_crm_test')) wp_die('Not allowed');
        $res = self::post(['fields' => ['Name' => 'Test lead from ' . get_bloginfo('name'), 'Email' => 'test-' . time() . '@example.com', 'Message' => 'Test from the RAREVO CRM WordPress plugin'], 'form' => 'Plugin test', 'page' => home_url('/')], false, true);
        self::back(self::result_msg($res, 'Test sent'));
    }
    public static function sync_existing() {
        if (!current_user_can('manage_options') || !check_admin_referer('rarevo_crm_sync')) wp_die('Not allowed');
        @set_time_limit(300);
        $created = 0; $updated = 0; $page = 1; $err = '';
        do {
            $ids = get_users(['fields' => 'ID', 'number' => 200, 'paged' => $page, 'orderby' => 'ID', 'order' => 'ASC']);
            $items = [];
            foreach ($ids as $id) { $it = self::user_item((int) $id); if ($it) $items[] = $it; }
            if ($items) {
                $res = self::post(['items' => $items], true, true);
                if (is_wp_error($res) || wp_remote_retrieve_response_code($res) !== 200) { $err = self::result_msg($res, ''); break; }
                $b = json_decode(wp_remote_retrieve_body($res), true);
                $created += (int) ($b['created'] ?? 0); $updated += (int) ($b['updated'] ?? 0);
            }
            $page++;
        } while (count($ids) === 200 && $page < 500);
        self::back($err ? $err : sprintf('Sync finished — %d added, %d updated in the CRM.', $created, $updated));
    }
}
Rarevo_CRM_Connector::init();
