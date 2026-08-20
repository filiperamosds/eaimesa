<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('email');
            $table->string('password_hash');
            $table->timestamp('created_at')->useCurrent();
            $table->unique('email', 'accounts_email_unique');
        });

        Schema::create('venues', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('owner_account_id');
            $table->string('name');
            $table->string('slug');
            $table->string('public_id', 16);
            $table->string('plan', 48)->default('cardapio');
            $table->string('subscription_status')->default('trial');
            $table->boolean('accepts_orders')->default(false);
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('current_period_ends_at')->nullable();
            $table->timestamps();
            $table->foreign('owner_account_id')->references('id')->on('accounts')->cascadeOnDelete();
            $table->unique('slug', 'venues_slug');
            $table->unique('public_id', 'venues_public_id');
            $table->unique('owner_account_id', 'venues_owner');
        });

        Schema::create('catalog_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('venue_id');
            $table->string('name');
            $table->integer('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->foreign('venue_id')->references('id')->on('venues')->cascadeOnDelete();
            $table->index(['venue_id', 'sort_order'], 'catalog_categories_venue');
        });

        Schema::create('catalog_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('venue_id');
            $table->uuid('category_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('image_url', 2048)->nullable();
            $table->integer('price_cents');
            $table->integer('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->integer('max_note_length')->default(80);
            $table->timestamps();
            $table->foreign('venue_id')->references('id')->on('venues')->cascadeOnDelete();
            $table->foreign('category_id')->references('id')->on('catalog_categories')->restrictOnDelete();
            $table->index(['venue_id', 'category_id'], 'catalog_items_venue_cat');
        });

        Schema::create('venue_tables', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('venue_id');
            $table->string('label', 40);
            $table->integer('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->foreign('venue_id')->references('id')->on('venues')->cascadeOnDelete();
            $table->index(['venue_id', 'sort_order'], 'venue_tables_venue');
            $table->unique(['venue_id', 'label'], 'venue_tables_venue_label');
        });

        Schema::create('table_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('venue_id');
            $table->uuid('table_id');
            $table->string('pin_hash');
            $table->string('status')->default('open');
            $table->timestamps();
            $table->timestamp('closed_at')->nullable();
            $table->char('open_table_id', 36)->nullable()->storedAs("IF(`status` = 'open', `table_id`, NULL)");
            $table->foreign('venue_id')->references('id')->on('venues')->cascadeOnDelete();
            $table->foreign('table_id')->references('id')->on('venue_tables')->restrictOnDelete();
            $table->index(['venue_id', 'table_id'], 'table_sessions_venue_table');
            $table->unique('open_table_id', 'table_sessions_one_open');
        });

        Schema::create('tabs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('venue_id');
            $table->uuid('table_id');
            $table->uuid('table_session_id');
            $table->string('guest_name');
            $table->string('guest_phone', 15);
            $table->string('status')->default('open');
            $table->timestamps();
            $table->timestamp('closed_at')->nullable();
            $table->string('open_session_phone', 80)->nullable()->storedAs(
                "IF(`status` = 'open', CONCAT(`table_session_id`, ':', `guest_phone`), NULL)"
            );
            $table->foreign('venue_id')->references('id')->on('venues')->cascadeOnDelete();
            $table->foreign('table_id')->references('id')->on('venue_tables')->restrictOnDelete();
            $table->foreign('table_session_id')->references('id')->on('table_sessions')->restrictOnDelete();
            $table->index(['venue_id', 'table_id'], 'tabs_venue_table');
            $table->unique('open_session_phone', 'tabs_open_phone');
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('venue_id');
            $table->string('status')->default('pending');
            $table->string('source')->default('counter');
            $table->uuid('table_id')->nullable();
            $table->string('table_label');
            $table->uuid('tab_id')->nullable();
            $table->string('idempotency_key')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
            $table->foreign('venue_id')->references('id')->on('venues')->cascadeOnDelete();
            $table->foreign('table_id')->references('id')->on('venue_tables')->nullOnDelete();
            $table->foreign('tab_id')->references('id')->on('tabs')->nullOnDelete();
            $table->index(['venue_id', 'status', 'created_at'], 'orders_venue_status_created');
            $table->unique(['venue_id', 'idempotency_key'], 'orders_venue_idempotency');
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->uuid('venue_id');
            $table->uuid('catalog_item_id')->nullable();
            $table->string('name_snapshot');
            $table->integer('unit_price_cents_snapshot');
            $table->integer('qty');
            $table->text('note')->nullable();
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->foreign('venue_id')->references('id')->on('venues')->cascadeOnDelete();
            $table->foreign('catalog_item_id')->references('id')->on('catalog_items')->nullOnDelete();
            $table->index('order_id', 'order_items_order');
        });

        Schema::create('venue_members', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('venue_id');
            $table->uuid('account_id');
            $table->string('role')->default('staff');
            $table->string('name');
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->foreign('venue_id')->references('id')->on('venues')->cascadeOnDelete();
            $table->foreign('account_id')->references('id')->on('accounts')->cascadeOnDelete();
            $table->unique(['venue_id', 'account_id'], 'venue_members_venue_account');
            $table->index('account_id', 'venue_members_account');
        });

        Schema::create('table_claims', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('venue_id');
            $table->uuid('table_id');
            $table->uuid('member_id')->nullable();
            $table->uuid('owner_account_id')->nullable();
            $table->string('token_hash');
            $table->timestamp('expires_at');
            $table->timestamp('redeemed_at')->nullable();
            $table->timestamp('invalidated_at')->nullable();
            $table->uuid('tab_id')->nullable();
            $table->uuid('table_session_id')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('venue_id')->references('id')->on('venues')->cascadeOnDelete();
            $table->foreign('table_id')->references('id')->on('venue_tables')->cascadeOnDelete();
            $table->foreign('member_id')->references('id')->on('venue_members')->nullOnDelete();
            $table->foreign('owner_account_id')->references('id')->on('accounts')->nullOnDelete();
            $table->foreign('tab_id')->references('id')->on('tabs')->nullOnDelete();
            $table->foreign('table_session_id')->references('id')->on('table_sessions')->nullOnDelete();
            $table->index('token_hash', 'table_claims_token_hash');
            $table->index(['venue_id', 'table_id'], 'table_claims_venue_table');
        });

        Schema::create('guest_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tab_id')->nullable();
            $table->uuid('table_session_id');
            $table->uuid('venue_id');
            $table->timestamp('expires_at');
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('tab_id')->references('id')->on('tabs')->cascadeOnDelete();
            $table->foreign('table_session_id')->references('id')->on('table_sessions')->cascadeOnDelete();
            $table->foreign('venue_id')->references('id')->on('venues')->cascadeOnDelete();
            $table->index('tab_id', 'guest_sessions_tab');
        });

        Schema::create('platform_users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('email');
            $table->string('password_hash');
            $table->string('name');
            $table->boolean('active')->default(true);
            $table->timestamp('created_at')->useCurrent();
            $table->unique('email', 'platform_users_email_unique');
        });

        Schema::create('platform_settings', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->integer('trial_days')->default(7);
            $table->integer('paid_period_days')->default(30);
            $table->timestamp('updated_at')->useCurrent();
        });

        Schema::create('plan_catalog', function (Blueprint $table) {
            $table->string('id', 48)->primary();
            $table->string('name');
            $table->string('kind')->default('cardapio');
            $table->integer('price_cents');
            $table->integer('promo_price_cents')->nullable();
            $table->text('blurb');
            $table->json('features');
            $table->boolean('listed')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamp('updated_at')->useCurrent();
        });

        Schema::create('billing_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('venue_id');
            $table->string('plan', 48);
            $table->string('plan_name');
            $table->string('method');
            $table->integer('amount_cents');
            $table->string('provider')->default('stub');
            $table->string('status')->default('success');
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('venue_id')->references('id')->on('venues')->cascadeOnDelete();
            $table->index('created_at', 'billing_events_created');
            $table->index(['venue_id', 'created_at'], 'billing_events_venue');
        });

        DB::statement("ALTER TABLE venues ADD CONSTRAINT venues_plan_format_chk CHECK (plan REGEXP '^[a-z0-9]+([_-][a-z0-9]+)*$' AND CHAR_LENGTH(plan) BETWEEN 3 AND 48)");
        DB::statement("ALTER TABLE plan_catalog ADD CONSTRAINT plan_catalog_kind_chk CHECK (kind IN ('cardapio', 'auto_atendimento'))");
        DB::statement("ALTER TABLE plan_catalog ADD CONSTRAINT plan_catalog_id_format_chk CHECK (id REGEXP '^[a-z0-9]+([_-][a-z0-9]+)*$' AND CHAR_LENGTH(id) BETWEEN 3 AND 48)");
        DB::statement("ALTER TABLE plan_catalog ADD CONSTRAINT plan_catalog_promo_chk CHECK (promo_price_cents IS NULL OR (promo_price_cents >= 0 AND promo_price_cents < price_cents))");
        DB::statement("ALTER TABLE table_sessions ADD CONSTRAINT table_sessions_status_chk CHECK (status IN ('open', 'closed'))");
        DB::statement("ALTER TABLE tabs ADD CONSTRAINT tabs_status_chk CHECK (status IN ('open', 'closed'))");
        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_status_chk CHECK (status IN ('pending', 'accepted', 'preparing', 'delivered', 'cancelled'))");
        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_source_chk CHECK (source IN ('counter', 'guest'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('billing_events');
        Schema::dropIfExists('plan_catalog');
        Schema::dropIfExists('platform_settings');
        Schema::dropIfExists('platform_users');
        Schema::dropIfExists('guest_sessions');
        Schema::dropIfExists('table_claims');
        Schema::dropIfExists('venue_members');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('tabs');
        Schema::dropIfExists('table_sessions');
        Schema::dropIfExists('venue_tables');
        Schema::dropIfExists('catalog_items');
        Schema::dropIfExists('catalog_categories');
        Schema::dropIfExists('venues');
        Schema::dropIfExists('accounts');
    }
};
