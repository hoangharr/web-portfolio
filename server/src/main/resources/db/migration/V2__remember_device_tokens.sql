create table remember_device_tokens (
  selector varchar(64) primary key,
  user_id bigint not null references users(id) on delete cascade,
  validator_hash varchar(64) not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default current_timestamp,
  last_used_at timestamptz not null default current_timestamp
);
create index remember_device_tokens_user_idx on remember_device_tokens(user_id);
