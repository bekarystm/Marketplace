import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Database, OrderStatus, Product } from '@marketplace/shared';
import { supabase, useAuth } from '@marketplace/mobile';

type Res = { data: unknown; error: unknown };
function unwrap<R extends Res>(res: R): Exclude<R['data'], null> {
  if (res.error) throw res.error;
  return res.data as Exclude<R['data'], null>;
}
function unwrapMaybe<R extends Res>(res: R): R['data'] {
  if (res.error) throw res.error;
  return res.data;
}

type ItemStatus = Database['public']['Enums']['order_item_status'];
type Vehicle = Database['public']['Enums']['vehicle_type'];

// ---------- Roles ----------
export function useStaffStores() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['staff_stores', userId],
    enabled: !!userId,
    queryFn: async () =>
      unwrap(await supabase.from('store_staff').select('role, store:stores(*)').eq('user_id', userId!)),
  });
}

export function useMyCourier() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['courier', userId],
    enabled: !!userId,
    queryFn: async () => unwrapMaybe(await supabase.from('couriers').select('*').eq('user_id', userId!).maybeSingle()),
  });
}

/** Upload a local image to the private courier-docs bucket and return its storage path. */
export async function uploadCourierDoc(userId: string, uri: string, name: string) {
  const res = await fetch(uri);
  const body = await res.arrayBuffer();
  const path = `${userId}/${name}-${Date.now()}.jpg`;
  unwrap(await supabase.storage.from('courier-docs').upload(path, body, { contentType: 'image/jpeg', upsert: true }));
  return path;
}

export function useSubmitCourierApplication() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: async (a: { vehicle: Vehicle; iin: string; documentPath: string; selfiePath: string; exists: boolean }) => {
      const fields = { vehicle: a.vehicle, iin: a.iin, document_photo_url: a.documentPath, selfie_url: a.selfiePath };
      if (a.exists) unwrap(await supabase.from('couriers').update(fields).eq('user_id', userId!));
      else unwrap(await supabase.from('couriers').insert({ user_id: userId!, ...fields }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courier', userId] }),
  });
}

export function useSetOnline() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: async (online: boolean) =>
      unwrap(await supabase.from('couriers').update({ is_online: online }).eq('user_id', userId!)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courier', userId] }),
  });
}

// ---------- Courier dispatch ----------
export function useAvailableOrders(enabled: boolean) {
  return useQuery({
    queryKey: ['available_orders'],
    enabled,
    refetchInterval: 15_000,
    queryFn: async () => unwrap(await supabase.rpc('courier_available_orders')),
  });
}

const ACTIVE: OrderStatus[] = ['accepted', 'picking', 'ready', 'delivering'];

export function useMyActiveDelivery() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['active_delivery', userId],
    enabled: !!userId,
    refetchInterval: 20_000,
    queryFn: async () =>
      unwrapMaybe(
        await supabase
          .from('orders')
          .select('*, store:stores(id, name, address_line, lat, lng, phone)')
          .eq('courier_id', userId!)
          .in('status', ACTIVE)
          .order('created_at')
          .limit(1)
          .maybeSingle(),
      ),
  });
}

export function useAcceptDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => unwrap(await supabase.rpc('courier_accept_order', { p_order_id: orderId })),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['available_orders'] });
      qc.invalidateQueries({ queryKey: ['active_delivery'] });
    },
  });
}

export function useReleaseDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => unwrap(await supabase.rpc('courier_release_order', { p_order_id: orderId })),
    onSettled: () => qc.invalidateQueries({ queryKey: ['active_delivery'] }),
  });
}

// ---------- Orders (shared by picker & courier) ----------
export function useOrderDetail(id: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['partner_order', id],
    enabled: !!id,
    queryFn: async () => {
      const order = unwrap(
        await supabase
          .from('orders')
          .select('*, store:stores(id, name, address_line, lat, lng, phone)')
          .eq('id', id!)
          .single(),
      );
      const items = unwrap(await supabase.from('order_items').select('*').eq('order_id', id!).order('created_at'));
      const client = unwrapMaybe(
        await supabase.from('profiles').select('full_name, phone').eq('id', order.client_id).maybeSingle(),
      );
      return { order, items, client };
    },
  });
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`partner-order-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, () =>
        qc.invalidateQueries({ queryKey: ['partner_order', id] }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${id}` }, () =>
        qc.invalidateQueries({ queryKey: ['partner_order', id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, qc]);
  return query;
}

export function useUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status, note }: { orderId: string; status: OrderStatus; note?: string }) =>
      unwrap(await supabase.rpc('update_order_status', { p_order_id: orderId, p_status: status, p_note: note ?? undefined })),
    onSettled: (_d, _e, v) => {
      qc.invalidateQueries({ queryKey: ['partner_order', v.orderId] });
      qc.invalidateQueries({ queryKey: ['store_orders'] });
      qc.invalidateQueries({ queryKey: ['active_delivery'] });
      qc.invalidateQueries({ queryKey: ['courier'] });
    },
  });
}

// ---------- Picker ----------
export function useStoreOrders(storeId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['store_orders', storeId],
    enabled: !!storeId,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('orders')
          .select('id, number, status, total, created_at, payment_method, courier_id, substitution_policy')
          .eq('store_id', storeId!)
          .in('status', ['placed', 'accepted', 'picking', 'ready'])
          .order('created_at'),
      ),
  });
  useEffect(() => {
    if (!storeId) return;
    const ch = supabase
      .channel(`store-orders-${storeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` }, () =>
        qc.invalidateQueries({ queryKey: ['store_orders', storeId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [storeId, qc]);
  return query;
}

export function usePickItem(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: {
      itemId: string;
      status: ItemStatus;
      pickedQuantity?: number | null;
      replacementProductId?: string | null;
      replacementQuantity?: number | null;
    }) =>
      unwrap(
        await supabase.rpc('picker_update_item', {
          p_item_id: a.itemId,
          p_status: a.status,
          p_picked_quantity: a.pickedQuantity ?? undefined,
          p_replacement_product_id: a.replacementProductId ?? undefined,
          p_replacement_quantity: a.replacementQuantity ?? undefined,
        }),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: ['partner_order', orderId] }),
  });
}

export function useStoreProductSearch(storeId: string | undefined, search: string) {
  return useQuery({
    queryKey: ['store_products', storeId, search],
    enabled: !!storeId && search.trim().length >= 2,
    queryFn: async () => {
      const pattern = `%${search.trim().replace(/[%_,()]/g, ' ')}%`;
      return unwrap(
        await supabase
          .from('products')
          .select('*')
          .eq('store_id', storeId!)
          .eq('is_available', true)
          .or(`name_ru.ilike.${pattern},name_kk.ilike.${pattern},barcode.eq.${search.trim().replace(/\D/g, '') || '0'}`)
          .limit(30),
      ) as Product[];
    },
  });
}
