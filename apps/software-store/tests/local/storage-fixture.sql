-- Only for reduced local runs. This is not a Storage API implementation.
create schema storage;
create table storage.buckets(id text primary key,name text not null,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
