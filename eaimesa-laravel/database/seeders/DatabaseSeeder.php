<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\CatalogCategory;
use App\Models\CatalogItem;
use App\Models\Order;
use App\Models\PlanCatalog;
use App\Models\PlatformSetting;
use App\Models\PlatformUser;
use App\Models\Venue;
use App\Models\VenueMember;
use App\Models\VenueTable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('demo1234');

        PlatformSetting::query()->updateOrCreate(
            ['id' => 'default'],
            ['trial_days' => 7, 'paid_period_days' => 30, 'updated_at' => now()],
        );

        $plans = [
            [
                'id' => 'cardapio',
                'name' => 'Cardápio',
                'kind' => 'cardapio',
                'price_cents' => 4900,
                'promo_price_cents' => 2900,
                'blurb' => 'Cardápio público com a sua URL. Sem pedido no celular.',
                'features' => ['URL pública /seu-bar', 'Categorias, itens e foto', 'QR do cardápio', '1 estabelecimento'],
                'listed' => true,
                'sort_order' => 0,
            ],
            [
                'id' => 'auto_atendimento',
                'name' => 'Auto atendimento',
                'kind' => 'auto_atendimento',
                'price_cents' => 14900,
                'promo_price_cents' => null,
                'blurb' => 'O cliente pede no celular. O garçom opera a fila.',
                'features' => [
                    'Tudo do Cardápio',
                    'Mesas e equipe (até 15 mesas, 5 garçons)',
                    'QR do garçom + PIN',
                    'Pedido, parcial e Kanban',
                ],
                'listed' => true,
                'sort_order' => 1,
            ],
        ];
        foreach ($plans as $plan) {
            PlanCatalog::query()->updateOrCreate(['id' => $plan['id']], $plan + ['updated_at' => now()]);
        }

        $ops = PlatformUser::query()->firstOrNew(['email' => 'ops@eaimesa.local']);
        $ops->fill(['password_hash' => $password, 'name' => 'Operação EaiMesa', 'active' => true]);
        $ops->save();

        $menu = $this->menu();
        $tiao = $this->ensureVenue('dono@bardotiao.local', $password, [
            'name' => 'Bar do Tião',
            'slug' => 'bar-do-tiao',
            'plan' => 'auto_atendimento',
            'accepts_orders' => true,
        ]);
        $this->resetCatalog($tiao, $menu);
        $this->seedTablesAndOrders($tiao);

        $staff = Account::query()->firstOrNew(['email' => 'garcom@bardotiao.local']);
        $staff->password_hash = $password;
        $staff->save();
        VenueMember::query()->updateOrCreate(
            ['venue_id' => $tiao->id, 'account_id' => $staff->id],
            ['role' => 'staff', 'name' => 'João Garçom', 'active' => true],
        );

        $lina = $this->ensureVenue('dono@cafedalina.local', $password, [
            'name' => 'Café da Lina',
            'slug' => 'cafe-da-lina',
            'plan' => 'cardapio',
            'accepts_orders' => false,
        ]);
        $this->resetCatalog($lina, array_slice($menu, 0, 3));
    }

    private function ensureVenue(string $email, string $password, array $attrs): Venue
    {
        $account = Account::query()->firstOrNew(['email' => $email]);
        $account->password_hash = $password;
        $account->save();

        $venue = Venue::query()->firstOrNew(['owner_account_id' => $account->id]);
        $venue->fill([
            'name' => $attrs['name'],
            'slug' => $attrs['slug'],
            'public_id' => $venue->public_id ?: bin2hex(random_bytes(6)),
            'plan' => $attrs['plan'],
            'subscription_status' => 'trial',
            'accepts_orders' => $attrs['accepts_orders'],
            'trial_ends_at' => now()->addDays(7),
            'current_period_ends_at' => null,
        ]);
        $venue->save();

        return $venue;
    }

    private function resetCatalog(Venue $venue, array $menu): void
    {
        Order::query()->where('venue_id', $venue->id)->delete();
        CatalogItem::query()->where('venue_id', $venue->id)->delete();
        CatalogCategory::query()->where('venue_id', $venue->id)->delete();

        foreach ($menu as $i => $cat) {
            $category = CatalogCategory::query()->create([
                'venue_id' => $venue->id,
                'name' => $cat['name'],
                'sort_order' => $i,
                'active' => true,
            ]);
            foreach ($cat['items'] as $j => $item) {
                CatalogItem::query()->create([
                    'venue_id' => $venue->id,
                    'category_id' => $category->id,
                    'name' => $item['name'],
                    'description' => $item['description'],
                    'image_url' => $item['imageUrl'],
                    'price_cents' => $item['priceCents'],
                    'sort_order' => $j,
                    'active' => true,
                ]);
            }
        }
    }

    private function seedTablesAndOrders(Venue $venue): void
    {
        VenueTable::query()->where('venue_id', $venue->id)->delete();
        $labels = array_merge(['Balcão'], array_map(fn ($i) => 'Mesa '.$i, range(1, 10)));
        $tables = [];
        foreach ($labels as $i => $label) {
            $tables[$label] = VenueTable::query()->create([
                'venue_id' => $venue->id,
                'label' => $label,
                'sort_order' => $i,
                'active' => true,
            ]);
        }
        $byName = CatalogItem::query()->where('venue_id', $venue->id)->get()->keyBy('name');
        $make = function (string $label, string $status, int $minutesAgo, array $lines) use ($venue, $tables, $byName) {
            $order = Order::query()->create([
                'venue_id' => $venue->id,
                'status' => $status,
                'source' => 'counter',
                'table_id' => $tables[$label]->id ?? null,
                'table_label' => $label,
                'created_at' => now()->subMinutes($minutesAgo),
                'updated_at' => now()->subMinutes($minutesAgo),
            ]);
            foreach ($lines as $line) {
                $item = $byName->get($line['name']);
                if (! $item) {
                    continue;
                }
                $order->items()->create([
                    'venue_id' => $venue->id,
                    'catalog_item_id' => $item->id,
                    'name_snapshot' => $item->name,
                    'unit_price_cents_snapshot' => $item->price_cents,
                    'qty' => $line['qty'],
                ]);
            }
        };
        $make('Mesa 3', 'pending', 4, [['name' => 'Calabresa acebolada', 'qty' => 1], ['name' => 'Chopp 500 ml', 'qty' => 2]]);
        $make('Mesa 1', 'pending', 12, [['name' => 'Pão de alho', 'qty' => 2]]);
        $make('Balcão', 'accepted', 8, [['name' => 'Caipirinha', 'qty' => 1], ['name' => 'Bolinho de bacalhau', 'qty' => 1]]);
        $make('Mesa 7', 'preparing', 18, [['name' => 'Frango a passarinho', 'qty' => 1], ['name' => 'Fritas com cheddar', 'qty' => 1], ['name' => 'Brahma lata', 'qty' => 3]]);
        $make('Mesa 2', 'delivered', 40, [['name' => 'Negroni', 'qty' => 2]]);
    }

    private function menu(): array
    {
        return [
            ['name' => 'Petiscos', 'items' => [
                ['name' => 'Pão de alho', 'description' => 'Na chapa, serve 2', 'priceCents' => 1290, 'imageUrl' => '/seed/pao-de-alho.jpg'],
                ['name' => 'Bolinho de bacalhau', 'description' => '6 unidades', 'priceCents' => 1800, 'imageUrl' => 'https://images.unsplash.com/photo-1608039755401-742074f0548d?auto=format&fit=crop&w=800&q=80'],
            ]],
            ['name' => 'Porções', 'items' => [
                ['name' => 'Calabresa acebolada', 'description' => 'Serve 2', 'priceCents' => 3290, 'imageUrl' => '/seed/calabresa.jpg'],
                ['name' => 'Fritas com cheddar', 'description' => 'Batata crocante', 'priceCents' => 2800, 'imageUrl' => 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80'],
                ['name' => 'Frango a passarinho', 'description' => 'Com limão', 'priceCents' => 3600, 'imageUrl' => '/seed/frango-passarinho.jpg'],
            ]],
            ['name' => 'Bebidas', 'items' => [
                ['name' => 'Chopp 500 ml', 'description' => 'Pilsen gelada', 'priceCents' => 1400, 'imageUrl' => 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=800&q=80'],
                ['name' => 'Brahma lata', 'description' => '350 ml', 'priceCents' => 800, 'imageUrl' => 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=800&q=80'],
                ['name' => 'Água sem gás', 'description' => '500 ml', 'priceCents' => 500, 'imageUrl' => 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=800&q=80'],
            ]],
            ['name' => 'Drinks', 'items' => [
                ['name' => 'Caipirinha', 'description' => 'Limão, cachaça e gelo', 'priceCents' => 2200, 'imageUrl' => '/seed/caipirinha.jpg'],
                ['name' => 'Negroni', 'description' => 'Clássico', 'priceCents' => 2800, 'imageUrl' => 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80'],
            ]],
        ];
    }
}
