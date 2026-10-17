-- Private bucket for user-generated AI images. Files are not public.
-- Only service-role Edge Functions may write objects; no public select/insert policy is added.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chaylueklab-ai-images', 'chaylueklab-ai-images', false, 12582912, array['image/png']::text[])
on conflict (id) do nothing;
