-- ---------- Privileges on functions ----------
revoke execute on function public._promo_discount(public.promo_codes, uuid, uuid, numeric) from public, anon, authenticated;
revoke execute on function public._recalc_order_totals(uuid) from public, anon, authenticated;
revoke execute on function public.confirm_card_payment(uuid, text, text, numeric, jsonb) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.reviews_update_courier_rating() from public, anon, authenticated;

revoke execute on function public.check_promo(text, uuid, numeric) from public, anon;
revoke execute on function public.place_order(uuid, uuid, public.payment_method, public.substitution_policy, uuid, text, boolean, text) from public, anon;
revoke execute on function public.update_order_status(uuid, public.order_status, text) from public, anon;
revoke execute on function public.picker_update_item(uuid, public.order_item_status, numeric, uuid, numeric) from public, anon;
revoke execute on function public.client_respond_replacement(uuid, boolean) from public, anon;
revoke execute on function public.courier_available_orders() from public, anon;
revoke execute on function public.courier_accept_order(uuid) from public, anon;
revoke execute on function public.courier_release_order(uuid, text) from public, anon;
revoke execute on function public.admin_review_courier(uuid, public.courier_application_status, text) from public, anon;
revoke execute on function public.admin_set_user_role(uuid, public.user_role) from public, anon;
revoke execute on function public.admin_set_user_blocked(uuid, boolean) from public, anon;
