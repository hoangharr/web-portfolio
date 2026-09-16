create table users (
  id bigserial primary key,
  email varchar(320) not null unique,
  display_name varchar(120) not null,
  password_hash varchar(100) not null,
  role varchar(20) not null check (role in ('LEARNER', 'TEACHER', 'ADMIN')),
  enabled boolean not null default true,
  created_at timestamptz not null default current_timestamp
);
create table courses (
  id bigserial primary key,
  slug varchar(100) not null unique,
  title varchar(200) not null,
  published boolean not null default false,
  created_at timestamptz not null default current_timestamp
);
create table enrollments (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  course_id bigint not null references courses(id) on delete cascade,
  enrolled_at timestamptz not null default current_timestamp,
  unique (user_id, course_id)
);
create table lesson_progress (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  lesson_id varchar(120) not null,
  last_slide integer not null default 1 check (last_slide > 0),
  completed boolean not null default false,
  updated_at timestamptz not null default current_timestamp,
  unique (user_id, lesson_id)
);
create table writing_drafts (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  lesson_id varchar(120) not null,
  section_id varchar(120) not null,
  content text not null default '',
  updated_at timestamptz not null default current_timestamp,
  unique (user_id, lesson_id, section_id)
);
create index lesson_progress_user_updated_idx on lesson_progress (user_id, updated_at desc);
insert into courses (slug, title, published) values ('aptis-b2', 'Aptis B2 Preparation', true);
