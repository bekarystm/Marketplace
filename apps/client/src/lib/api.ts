import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Address,
  Category,
  ChatMessage,
  Order,
  OrderItem,
  PaymentMethod,
  Product,
  Store,
  SubstitutionPolicy,
} from '@marketplace/shared';
import { supabase } from '@marketplace/mobile';
import { useAuth } from '@marketplace/mobile';

type Res = { data: unknown; error: unknown };

/** Throw on error, return non-null data. */
function unwrap<R extends Res>(res: R): Exclude<R['data'], null> {
  if (res.error) throw res.error;
  return res.data as Exclude<R['data'], null>;
}

/** Throw on error, data may be null (maybeSingle). */
function unwrapMaybe<R extends Res>(res: R): R['data'] {
  if (res.error) throw res.error;
  return res.data;
}

// ---------- Catalog ----------
export function useStores() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: async () =>
      unwrap(await supabase.from('stores').select('*').eq('is_active', true).order('sort_order')),
  });
}

export function useStore(id: string | undefined) {
  return useQuery({
    queryKey: ['store', id],
    enabled: !!id,
    queryFn: async () => unwrap(await supabase.from('stores').select('*').eq('id', id!).single()),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () =>
      unwrap(await supabase.from('categories').select('*').eq('is_active', true).order('sort_order')),
  });
}

export function useProducts(params: { storeId?: string; categoryId?: string | null; search?: string }) {
  const { storeId, categoryId, search } = params;
  return useQuery({
    queryKey: ['products', storeId ?? 'all', categoryId ?? 'all', search ?? ''],
    enabled: !!storeId || (search?.trim().length ?? 0) >= 2,
    queryFn: async () => {
      let q = supabase.from('products').select('*').order('sort_order').limit(200);
      if (storeId) q = q.eq('store_id', storeId);
      if (categoryId) q = q.eq('category_id', categoryId);
      const s = search?.trim();
      if (s) {
        const pattern = `%${s.replace(/[%_,()]/g, ' ')}%`;
        q = q.or(`name_ru.ilike.${pattern},name_kk.ilike.${pattern},brand.ilike.${pattern}`);
      }
      return unwrap(await q);
    },
  });
}

// ---------- Cart ----------
export type CartRow = { product_id: string; quantity: number; product: Product };

export function useCart() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['cart', userId],
    enabled: !!userId,
    queryFn: async () =>
      unwrap(
        await supabase.from('cart_items').select('product_id, quantity, product:products(*)').order('updated_at'),
      ),
  });
}

export function useSetCartQuantity() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: async ({ product, quantity }: { product: Product; quantity: number }) => {
      if (!userId) throw new Error('not_authenticated');
      if (quantity <= 0) {
        unwrap(await supabase.from('cart_items').delete().eq('product_id', product.id).eq('user_id', userId));
      } else {
        unwrap(
          await supabase
            .from('cart_items')
            .upsert({ user_id: userId, product_id: product.id, quantity, updated_at: new Date().toISOString() }),
        );
      }
    },
    onMutate: async ({ product, quantity }) => {
      const key = ['cart', userId];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<CartRow[]>(key);
      const next = (prev ?? []).filter((r) => r.product_id !== product.id);
      if (quantity > 0) {
        const existing = prev?.find((r) => r.product_id === product.id);
        const row = { product_id: product.id, quantity, product };
        if (existing) next.splice(prev!.indexOf(existing), 0, row);
        else next.push(row);
      }
      qc.setQueryData(key, next);
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['cart', userId], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['cart', userId] }),
  });
}

export function useClearStoreCart() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: async (productIds: string[]) => {
      unwrap(await supabase.from('cart_items').delete().in('product_id', productIds).eq('user_id', userId!));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['cart', userId] }),
  });
}

// ---------- Addresses ----------
export function useAddresses() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['addresses', userId],
    enabled: !!userId,
    queryFn: async () =>
      unwrap(await supabase.from('addresses').select('*').order('created_at', { ascending: false })),
  });
}

export function useSaveAddress() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: async (address: Omit<Address, 'id' | 'user_id' | 'created_at'>) => {
      if (address.is_default) {
        unwrap(await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId!));
      }
      return unwrap(
        await supabase.from('addresses').insert({ ...address, user_id: userId! }).select().single(),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses', userId] }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('addresses').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses', userId] }),
  });
}

// ---------- Promo & settings ----------
export async function checkPromo(code: string, storeId: string, itemsTotal: number) {
  return unwrap(
    await supabase.rpc('check_promo', { p_code: code, p_store_id: storeId, p_items_total: itemsTotal }),
  );
}

export function useAppSettings() {
  return useQuery({
    queryKey: ['app_settings'],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const rows = unwrap(await supabase.from("app_settings").select("key, value"));
      return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>;
    },
  });
}

// ---------- Orders ----------
export type OrderWithStore = Order & { store: Pick<Store, 'id' | 'name' | 'logo_url' | 'phone'> | null };

export function useOrders() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['orders', userId],
    enabled: !!userId,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('orders')
          .select('*, store:stores(id, name, logo_url, phone)')
          .eq('client_id', userId!)
          .order('created_at', { ascending: false })
          .limit(50),
      ),
  });
}

export function useOrder(id: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['order', id],
    enabled: !!id,
    queryFn: async () => {
      const order = unwrap(
        await supabase.from('orders').select('*, store:stores(id, name, logo_url, phone)').eq('id', id!).single(),
      );
      const items = unwrap(
        await supabase.from('order_items').select('*').eq('order_id', id!).order('created_at'),
      );
      return { order, items };
    },
  });

  // live updates of status and picking progress
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, () =>
        qc.invalidateQueries({ queryKey: ['order', id] }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${id}` }, () =>
        qc.invalidateQueries({ queryKey: ['order', id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  return query;
}

export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      storeId: string;
      addressId: string;
      paymentMethod: PaymentMethod;
      substitutionPolicy: SubstitutionPolicy;
      promoCode?: string;
      useBonus: boolean;
      comment?: string;
      slotId?: string | null;
    }) =>
      unwrap(
        await supabase.rpc('place_order', {
          p_store_id: args.storeId,
          p_address_id: args.addressId,
          p_payment_method: args.paymentMethod,
          p_substitution_policy: args.substitutionPolicy,
          p_promo_code: args.promoCode || undefined,
          p_use_bonus: args.useBonus,
          p_comment: args.comment || undefined,
          p_slot_id: args.slotId ?? undefined,
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) =>
      unwrap(
        await supabase.rpc('update_order_status', { p_order_id: orderId, p_status: 'cancelled', p_note: reason ?? undefined }),
      ),
    onSuccess: (o) => {
      qc.invalidateQueries({ queryKey: ['order', o.id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useRespondReplacement(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, approve }: { itemId: string; approve: boolean }) =>
      unwrap(await supabase.rpc('client_respond_replacement', { p_item_id: itemId, p_approve: approve })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order', orderId] }),
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: async (r: { orderId: string; storeRating: number; courierRating?: number; comment?: string }) =>
      unwrap(
        await supabase.from('reviews').insert({
          order_id: r.orderId,
          client_id: userId!,
          store_rating: r.storeRating,
          courier_rating: r.courierRating ?? null,
          comment: r.comment ?? null,
        }),
      ),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['review', v.orderId] }),
  });
}

export function useReview(orderId: string | undefined) {
  return useQuery({
    queryKey: ['review', orderId],
    enabled: !!orderId,
    queryFn: async () =>
      unwrapMaybe(await supabase.from('reviews').select('*').eq('order_id', orderId!).maybeSingle()),
  });
}

// ---------- Courier location ----------
export function useCourierLocation(courierId: string | null | undefined, active: boolean) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['courier_location', courierId],
    enabled: !!courierId && active,
    refetchInterval: 15000,
    queryFn: async () =>
      unwrapMaybe(
        await supabase.from('courier_locations').select('lat, lng, updated_at').eq('courier_id', courierId!).maybeSingle(),
      ),
  });
  useEffect(() => {
    if (!courierId || !active) return;
    const channel = supabase
      .channel(`courier-${courierId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courier_locations', filter: `courier_id=eq.${courierId}` },
        (payload) => qc.setQueryData(['courier_location', courierId], payload.new),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [courierId, active, qc]);
  return query;
}

