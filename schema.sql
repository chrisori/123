-- Run this in Supabase > SQL Editor
create table products (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  category text not null check (category in ('dog','cat','small')),
  price numeric(10,2) not null,
  image_url text,
  emoji text,
  active boolean default true
);
create table orders (
  id uuid primary key,
  customer_name text not null, email text not null, phone text not null, address text not null,
  status text not null default 'pending',   -- pending | paid
  payment_ref text,
  created_at timestamptz default now()
);
create table order_items (
  id bigint generated always as identity primary key,
  order_id uuid references orders(id) on delete cascade,
  product_id bigint references products(id),
  quantity int not null check (quantity > 0)
);

alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
-- Visitors can read products and place orders, but cannot read other people's orders
create policy "read products" on products for select using (active);
create policy "create order" on orders for insert with check (status = 'pending');
create policy "create items" on order_items for insert with check (true);

insert into products (name, description, category, price, emoji) values
('Chicken & Rice Dog Food 3kg','Complete adult dry food.','dog',749,'🐕'),
('Rubber Chew Bone','Tough toy for strong chewers.','dog',199,'🦴'),
('Tuna Cat Food 1.2kg','Dry food with real tuna.','cat',459,'🐈'),
('Feather Wand Toy','Interactive play for indoor cats.','cat',129,'🪶'),
('Hamster Wheel','Silent spinner, 18cm.','small',349,'🐹'),
('Rabbit Hay 1kg','Fresh timothy hay.','small',189,'🐇');
