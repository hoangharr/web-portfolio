create table mock_attempts (
  id uuid primary key,
  user_id bigint not null references users(id) on delete cascade,
  assessment_id varchar(120) not null,
  state text not null,
  submitted boolean not null default false,
  version bigint not null default 0,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,
  speaking_audio bytea,
  speaking_mime varchar(100)
);
create index mock_attempts_user_updated_idx on mock_attempts(user_id, updated_at desc);
