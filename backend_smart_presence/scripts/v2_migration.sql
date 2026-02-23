-- V3 Migration: Simple School Model
-- Target tables: organizations (school), groups (class), staff, students, timetable

-- 0) Drop all legacy/current tables (destructive)
drop table if exists attendance_records cascade;
drop table if exists attendance_sessions cascade;
drop table if exists members cascade;
drop table if exists staff_profiles cascade;
drop table if exists student_subjects cascade;
drop table if exists class_subjects cascade;
drop table if exists staff_subjects cascade;
drop table if exists subjects cascade;
drop table if exists timetables cascade;
drop table if exists students cascade;
drop table if exists classes cascade;
drop table if exists timetable cascade;
drop table if exists staff cascade;
drop table if exists groups cascade;
drop table if exists organizations cascade;

-- 1) Organizations (school)
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- 2) Groups (class)
create table groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  code text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_groups_org foreign key (organization_id) references organizations (id)
);

-- 3) Staff
create table staff (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  email text unique,
  staff_code text unique,
  role text default 'STAFF',
  is_active boolean default true,
  hashed_password text,
  is_superuser boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_staff_org foreign key (organization_id) references organizations (id)
);

-- 4) Students
create table students (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  group_id uuid not null,
  name text not null,
  roll_no text,
  email text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_students_org foreign key (organization_id) references organizations (id),
  constraint fk_students_group foreign key (group_id) references groups (id)
);

-- 5) Timetable (class 1-5)
create table timetable (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  day_of_week int not null check (day_of_week between 1 and 7),
  period int not null,
  subject text not null,
  staff_id uuid,
  start_time time,
  end_time time,
  created_at timestamptz default now(),
  constraint fk_timetable_group foreign key (group_id) references groups (id),
  constraint fk_timetable_staff foreign key (staff_id) references staff (id)
);

-- Optional indexes
create index idx_groups_org on groups (organization_id);
create index idx_staff_org on staff (organization_id);
create index idx_students_org on students (organization_id);
create index idx_students_group on students (group_id);
create index idx_timetable_group on timetable (group_id);
create index idx_timetable_staff on timetable (staff_id);
