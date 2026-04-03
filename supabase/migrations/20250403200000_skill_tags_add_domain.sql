-- skill_tags：學科領域（與國二理化 v2 seed 對齊）
alter table public.skill_tags add column if not exists domain text;

comment on column public.skill_tags.domain is '學科領域，例如 chemistry';
