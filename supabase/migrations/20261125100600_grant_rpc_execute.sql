-- =====================================================================
-- Fix: `revoke ... from public` also removed access for `authenticated`,
-- because in this project roles receive EXECUTE only through PUBLIC.
-- Grant the client-facing RPCs to signed-in users explicitly, and the
-- server-only ones to service_role.
-- =====================================================================
grant execute on function public.check_promo(text, uuid, numeric) to authenticated;
grant execute on function public.place_order(uuid, uuid, public.payment_method, public.substitution_policy, uuid, text, boolean, text) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.picker_update_item(uuid, public.order_item_status, numeric, uuid, numeric) to authenticated;
grant execute on function public.client_respond_replacement(uuid, boolean) to authenticated;
grant execute on function public.courier_available_orders() to authenticated;
grant execute on function public.courier_accept_order(uuid) to authenticated;
grant execute on function public.courier_release_order(uuid, text) to authenticated;
grant execute on function public.admin_review_courier(uuid, public.courier_application_status, text) to authenticated;
grant execute on function public.admin_set_user_role(uuid, public.user_role) to authenticated;
grant execute on function public.admin_set_user_blocked(uuid, boolean) to authenticated;
grant execute on function public.find_profile_by_phone(text) to authenticated;
grant execute on function public.staff_profiles(uuid) to authenticated;

grant execute on function public.confirm_card_payment(uuid, text, text, numeric, jsonb) to service_role;
