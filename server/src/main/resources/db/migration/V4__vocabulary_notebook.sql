create table vocabulary_notebook (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  word varchar(100) not null,
  phonetic varchar(255),
  definition text,
  example text,
  created_at timestamptz not null default current_timestamp,
  unique (user_id, word)
);
create index vocabulary_notebook_user_created_idx on vocabulary_notebook (user_id, created_at desc);
