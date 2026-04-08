alter table public.tender_document_extractions
drop constraint if exists tender_document_extractions_extractor_type_check;

alter table public.tender_document_extractions
add constraint tender_document_extractions_extractor_type_check
check (extractor_type in ('none', 'plain_text', 'markdown', 'csv', 'xlsx', 'pdf', 'docx', 'unsupported'));