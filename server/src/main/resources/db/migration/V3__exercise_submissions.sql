create table exercise_submissions (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  lesson_id varchar(120) not null,
  section_id varchar(120) not null,
  content text not null default '',
  score integer,
  total integer,
  submitted_at timestamptz not null default current_timestamp,
  unique (user_id, lesson_id, section_id)
);
create index exercise_submissions_user_submitted_idx on exercise_submissions (user_id, submitted_at desc);
