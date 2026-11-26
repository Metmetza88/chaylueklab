-- Added to Primary Supabase project: education_2570 only
-- No existing tables, records or RLS policies changed.
create index if not exists edu2570_catalog_program_idx on education_2570.catalog (program_id);
create index if not exists edu2570_certificates_school_idx on education_2570.certificates (school_id);
create index if not exists edu2570_certificates_user_idx on education_2570.certificates (user_id);
create index if not exists edu2570_attempts_exam_idx on education_2570.exam_attempts (exam_id);
create index if not exists edu2570_attempts_user_idx on education_2570.exam_attempts (user_id);
create index if not exists edu2570_questions_exam_idx on education_2570.exam_questions (exam_id);
create index if not exists edu2570_exams_school_idx on education_2570.exams (school_id);
create index if not exists edu2570_members_user_idx on education_2570.members (user_id);
create index if not exists edu2570_quote_items_program_idx on education_2570.quote_items (program_id);
create index if not exists edu2570_quote_items_quote_idx on education_2570.quote_items (quote_id);
create index if not exists edu2570_quotes_creator_idx on education_2570.quotes (created_by);
create index if not exists edu2570_quotes_school_recent_idx on education_2570.quotes (school_id, created_at desc);
