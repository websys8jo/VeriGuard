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
  bfs_path jsonb not null,       -- ordered array of rule ids actually visited
  gold_path jsonb,                -- ordered array of rule ids on the answer path
  diverge_level text check (diverge_level in ('major', 'mid', 'minor')), -- null = matched
  nodes_visited int not null,
  total_nodes int not null,
  tau_used double precision not null
);

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
