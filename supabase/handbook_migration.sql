-- ============================================================
-- Handbook CMS Migration
-- Run this in your Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Create the handbook_nodes table
-- Uses a self-referencing adjacency list with path-encoded IDs
-- to support arbitrary nesting (e.g. "1", "1.1", "1.1.2.3.1.1")
-- ============================================================
create table if not exists public.handbook_nodes (
  id          text primary key,           -- path-based ID e.g. "1", "1.1", "1.1.2.3"
  parent_id   text references public.handbook_nodes(id) on delete cascade,
  title       text not null,
  content     text,                        -- HTML content; NULL for chapter-level nodes
  sort_order  int not null default 0,
  depth       int not null default 0,      -- 0 = chapter, 1 = section, 2+ = subsection
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for fast parent lookups
create index if not exists handbook_nodes_parent_id_idx on public.handbook_nodes(parent_id);
create index if not exists handbook_nodes_depth_idx on public.handbook_nodes(depth);

-- 2. Auto-update updated_at on row changes
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists handbook_nodes_updated_at on public.handbook_nodes;
create trigger handbook_nodes_updated_at
  before update on public.handbook_nodes
  for each row execute procedure public.set_updated_at();

-- 3. Enable Row Level Security
-- ============================================================
alter table public.handbook_nodes enable row level security;

-- READ: any authenticated user can read
create policy "Authenticated users can read handbook"
  on public.handbook_nodes for select
  to authenticated
  using (true);

-- WRITE: only admins can insert/update/delete
-- (We rely on user role stored in profiles table)
create policy "Admins can insert handbook nodes"
  on public.handbook_nodes for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update handbook nodes"
  on public.handbook_nodes for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete handbook nodes"
  on public.handbook_nodes for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 4. Seed data — mirrors current handbookData.ts
-- ============================================================

-- Chapters (depth=0)
insert into public.handbook_nodes (id, parent_id, title, content, sort_order, depth) values
  ('1', null, 'CHAPTER 1', null, 1, 0),
  ('2', null, 'CHAPTER 2', null, 2, 0),
  ('3', null, 'CHAPTER 3', null, 3, 0),
  ('4', null, 'CHAPTER 4', null, 4, 0)
on conflict (id) do nothing;

-- Sections of Chapter 1 (depth=1)
insert into public.handbook_nodes (id, parent_id, title, content, sort_order, depth) values
  ('1.1', '1', 'History of the College',
    '<p>The Dr. Yanga''s Colleges, Inc. was founded in 1950...</p><p>It started as a small institution dedicated to providing quality education to the youth of Bulacan.</p>',
    1, 1),
  ('1.2', '1', 'Philosophy, Vision, and Mission',
    '<h3>Philosophy</h3><p>Education is a lifelong process of growth...</p><h3>Vision</h3><p>We envision DYCI as a center of excellence...</p><h3>Mission</h3><p>To provide quality instruction, research, and community extension services...</p>',
    2, 1),
  ('1.3', '1', 'College Seal and Colors',
    '<p>The College Seal represents the ideals and aspirations of the institution.</p><p><strong>Blue</strong> stands for loyalty and justice.</p><p><strong>White</strong> stands for purity and integrity.</p>',
    3, 1)
on conflict (id) do nothing;

-- Sections of Chapter 2 (depth=1)
insert into public.handbook_nodes (id, parent_id, title, content, sort_order, depth) values
  ('2.1', '2', 'Admission Requirements',
    '<ul><li>Form 138 (Report Card)</li><li>Certificate of Good Moral Character</li><li>Birth Certificate (PSA)</li><li>2x2 ID Pictures</li></ul>',
    1, 1),
  ('2.2', '2', 'Enrollment Procedure',
    '<ol><li>Present credentials to the Registrar''s Office.</li><li>Pay the assessment fee at the Cashier.</li><li>Proceed to the College Dean for advising.</li></ol>',
    2, 1)
on conflict (id) do nothing;

-- Sections of Chapter 3 (depth=1)
insert into public.handbook_nodes (id, parent_id, title, content, sort_order, depth) values
  ('3.1', '3', 'Grading System',
    '<table><thead><tr><th>Grade</th><th>Equivalent</th><th>Description</th></tr></thead><tbody><tr><td>1.00</td><td>99-100</td><td>Excellent</td></tr><tr><td>1.25</td><td>96-98</td><td>Superior</td></tr><tr><td>5.00</td><td>Below 75</td><td>Failed</td></tr></tbody></table>',
    1, 1),
  ('3.2', '3', 'Academic Retention',
    '<p>Students must maintain a weighted average of...</p>',
    2, 1)
on conflict (id) do nothing;

-- Sections of Chapter 4 (depth=1)
insert into public.handbook_nodes (id, parent_id, title, content, sort_order, depth) values
  ('4.1', '4', 'Code of Conduct',
    '<p>All students are expected to conduct themselves with...</p>',
    1, 1),
  ('4.2', '4', 'Disciplinary Sanctions',
    '<p>Violations of the code of conduct may result in...</p>',
    2, 1)
on conflict (id) do nothing;

-- ============================================================
-- 5. Handbook Views Tracking
-- ============================================================
create table if not exists public.handbook_views (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete set null,
  node_id    text,
  viewed_at  timestamptz not null default now()
);

create index if not exists handbook_views_user_id_idx on public.handbook_views(user_id);
create index if not exists handbook_views_node_id_idx on public.handbook_views(node_id);

alter table public.handbook_views enable row level security;

-- Any authenticated user can log their own views
create policy "Users can log their own views"
  on public.handbook_views for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Any authenticated user can read view stats (needed for dashboard count)
create policy "Authenticated users can read view counts"
  on public.handbook_views for select
  to authenticated
  using (true);
