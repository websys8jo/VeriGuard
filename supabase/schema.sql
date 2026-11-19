-- VeriGuard schema
-- Run in Supabase SQL Editor (or `psql "$DATABASE_URL" -f supabase/schema.sql`)

create extension if not exists vector;

-- ---------------------------------------------------------------------
-- Core entities
-- ---------------------------------------------------------------------

create table if not exists rules (
  id text primary key,
  source text not null check (source in ('dna', 'jigsaw')),
  level text not null check (level in ('major', 'mid', 'minor')), -- 대/중/소분류
  parent_id text references rules(id),
  rule_text text not null,
  examples jsonb not null default '[]'
);

create table if not exists texts (
  id text primary key,
  source text not null check (source in ('dna', 'jigsaw', 'prosocial')),
  split text not null check (split in ('dev', 'test')),
  raw_text text not null,
  context text,
  human_label text,
  response_llm text, -- only populated for Do-Not-Answer (one of its 6 responding LLMs)
  gold_rule_id text references rules(id)
);

create index if not exists texts_source_split_idx on texts(source, split);
create index if not exists texts_gold_rule_idx on texts(gold_rule_id);

-- 2D projection (e.g. UMAP over all-roberta-large-v1 embeddings) for an
-- embedding-map view; one row per text, source/split denormalized for
-- filtering without a join.
create table if not exists text_coords (
  text_id text primary key references texts(id) on delete cascade,
  source text not null,
  split text not null,
  x double precision not null,
  y double precision not null,
  projection_method text not null
);

-- ---------------------------------------------------------------------
-- P1: rule-finding (BFS) support
-- ---------------------------------------------------------------------

create table if not exists similarity_steps (
  id bigserial primary key,
  text_id text not null references texts(id) on delete cascade,
  rule_id text not null references rules(id) on delete cascade,
  level text not null check (level in ('major', 'mid', 'minor')),
  score double precision not null,
  embedding vector(1024) -- all-roberta-large-v1 dim; null is fine if not cached
);

create index if not exists similarity_steps_text_idx on similarity_steps(text_id);
create index if not exists similarity_steps_rule_idx on similarity_steps(rule_id);

create table if not exists bfs_runs (
  text_id text primary key references texts(id) on delete cascade,
  bfs_path jsonb not null,        -- retrieved_rule_path: one node per level reached
  visited_rule_ids jsonb not null, -- every rule id whose similarity was compared
  gold_path jsonb,                -- ordered array of rule ids on the answer path
  diverge_level text check (diverge_level in ('major', 'mid', 'minor')), -- null = matched
  nodes_visited int not null,
  total_nodes int not null,
  tau_used double precision not null
);

alter table bfs_runs add column if not exists visited_rule_ids jsonb not null default '[]';

-- Aggregate P1 metrics precomputed over a tau grid (0.00-0.60 step 0.02), since
-- recomputing BFS for all ~7,663 DNA+Jigsaw texts from 443k similarity rows on
-- every slider tick isn't practical client-side. The tau slider snaps to the
-- nearest grid value for these three; per-text BFS (bfs_runs above, or live
-- recompute from similarity_steps) stays exact for any tau.
create table if not exists p1_tau_grid (
  id bigserial primary key,
  tau double precision not null,
  source text not null check (source in ('dna', 'jigsaw')),
  split text not null check (split in ('dev', 'test')),
  topk1_acc double precision not null,
  topk3_acc double precision not null,
  efficiency double precision not null, -- avg(nodes_visited / total_nodes)
  n int not null,
  unique (tau, source, split)
);

-- Per-rule top-1 accuracy at each grid tau, for the P1 aggregate tree view
-- ("자주 틀리는 가지가 보이도록 강조").
create table if not exists p1_node_stats (
  id bigserial primary key,
  tau double precision not null,
  rule_id text not null references rules(id) on delete cascade,
  n_gold int not null,     -- texts whose gold_rule_id is this rule
  n_correct int not null,  -- of those, how many BFS found == this rule at this tau
  unique (tau, rule_id)
);

-- Which rule BFS actually lands on for every text at each grid tau, so clicking
-- a rule node can list "texts BFS retrieved this rule for" (not just "texts
-- whose gold rule is this"). One row per (tau, text_id).
create table if not exists p1_rule_texts (
  id bigserial primary key,
  tau double precision not null,
  rule_id text not null references rules(id) on delete cascade,
  text_id text not null references texts(id) on delete cascade,
  unique (tau, text_id)
);

create index if not exists p1_rule_texts_lookup_idx on p1_rule_texts(tau, rule_id);

-- Texts where the BFS-found rule changes between two adjacent grid tau values
-- ("경계 사례": nudging tau slightly flips the outcome).
create table if not exists p1_boundary_cases (
  id bigserial primary key,
  text_id text not null references texts(id) on delete cascade,
  tau_low double precision not null,
  tau_high double precision not null,
  rule_id_low text references rules(id),
  rule_id_high text references rules(id)
);

create index if not exists p1_boundary_cases_text_idx on p1_boundary_cases(text_id);

-- ---------------------------------------------------------------------
-- P2: judgment comparison
-- ---------------------------------------------------------------------

create table if not exists judgments (
  id bigserial primary key,
  text_id text not null references texts(id) on delete cascade,
  model_name text not null check (
    model_name in ('llama_guard_3_1b', 'qwen3guard_gen_0_6b', 'shieldgemma_2b', 'team_judge')
  ),
  condition text not null default 'default' check (
    condition in ('default', 'rule_excluded', 'rule_sentence_only', 'rule_sentence_examples')
  ),
  rule_id text references rules(id), -- rule sentence fed in, for shieldgemma/team_judge conditions
  violation_prob double precision not null,
  split text not null check (split in ('dev', 'test')),
  unique (text_id, model_name, condition, rule_id)
);

create index if not exists judgments_text_idx on judgments(text_id);
create index if not exists judgments_model_condition_idx on judgments(model_name, condition);

create table if not exists kappa_pairs (
  id bigserial primary key,
  source text not null,
  split text not null,
  model_a text not null,
  model_b text not null,
  kappa double precision not null,
  n int not null
);

-- ---------------------------------------------------------------------
-- P3: wrong-judgment diagnosis
-- ---------------------------------------------------------------------

create table if not exists diagnoses (
  text_id text primary key references texts(id) on delete cascade,
  cause_code int not null check (cause_code between 1 and 4),
  cause_label text not null, -- '규칙 찾기 문제' | '라벨 확인 필요' | '규칙 문장 문제' | '판정 모델 문제'
  topk_threshold_used int,
  details jsonb not null default '{}'
);

-- ---------------------------------------------------------------------
-- P4: revision effects
-- ---------------------------------------------------------------------

create table if not exists rule_revisions (
  id bigserial primary key,
  rule_id text references rules(id),
  author text,
  before_text text not null,
  after_text text not null,
  before_examples jsonb not null default '[]',
  after_examples jsonb not null default '[]',
  before_metrics jsonb not null default '{}',
  after_metrics jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists metrics_cache (
  id bigserial primary key,
  source text not null,
  split text not null,
  model_name text,
  condition text,
  metric_name text not null, -- 'roc_auc' | 'pr_auc' | 'f1' | 'cohens_kappa_human' | 'topk1_acc' | 'topk3_acc' | 'bfs_efficiency'
  value double precision not null,
  n int not null,
  unique (source, split, model_name, condition, metric_name)
);

-- ---------------------------------------------------------------------
-- Internal tool: no end-user auth, so RLS stays off. Reads happen through
-- the anon key from Server Components; writes (rule_revisions, re-judge
-- caching) go through the service_role key in Route Handlers only.
-- ---------------------------------------------------------------------
