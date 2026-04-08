-- Speed up the post-login legal acceptance check.
--
-- After authentication, the app loads the current user's acceptance history in
-- reverse chronological order. Relying on RLS alone means PostgREST can still
-- evaluate the legal_document_acceptances SELECT policy across a broad slice of
-- the table before it narrows results to the current user. The row-dependent
-- owner/admin branch in that policy makes the scan materially more expensive.
--
-- A dedicated (user_id, accepted_at desc) index aligns with the actual login
-- query shape and avoids the statement-timeout path seen in production.

create index if not exists legal_document_acceptances_user_accepted_at_idx
on public.legal_document_acceptances(user_id, accepted_at desc);