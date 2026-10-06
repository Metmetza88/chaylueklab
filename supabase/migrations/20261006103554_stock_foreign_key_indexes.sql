-- Match composite FK column order without adding duplicate inventory indexes.
-- These empty/new module indexes are replaced; no stock data or grants change.
begin;
drop index public.stock_variants_product_idx;
create index stock_variants_product_idx on public.stock_variants(product_id,shop_id);
drop index public.stock_transactions_variant_idx;
create index stock_transactions_variant_idx on public.stock_transactions(variant_id,shop_id,created_at desc);
commit;
