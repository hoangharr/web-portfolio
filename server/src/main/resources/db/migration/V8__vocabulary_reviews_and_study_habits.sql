alter table vocabulary_notebook
  add column if not exists review_due_at timestamptz not null default current_timestamp,
  add column if not exists review_interval_days integer not null default 0 check (review_interval_days >= 0),
  add column if not exists review_repetitions integer not null default 0 check (review_repetitions >= 0);

create index if not exists vocabulary_notebook_due_review_idx
  on vocabulary_notebook (user_id, review_due_at);

create table study_daily_activity (
  user_id bigint not null references users(id) on delete cascade,
  activity_date date not null,
  lesson_actions integer not null default 0 check (lesson_actions >= 0),
  mock_actions integer not null default 0 check (mock_actions >= 0),
  vocabulary_actions integer not null default 0 check (vocabulary_actions >= 0),
  primary key (user_id, activity_date)
);
