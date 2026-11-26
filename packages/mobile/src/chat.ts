import { channelName } from '@marketplace/shared';
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChatMessage } from '@marketplace/shared';
import { supabase } from './supabase';
import { useAuth } from './auth';

type Res = { data: unknown; error: unknown };
function unwrap<R extends Res>(res: R): Exclude<R['data'], null> {
  if (res.error) throw res.error;
  return res.data as Exclude<R['data'], null>;
}
function unwrapMaybe<R extends Res>(res: R): R['data'] {
  if (res.error) throw res.error;
  return res.data;
}

// ---------- Chat ----------
export function useChat(params: { orderId?: string; support?: boolean }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const chatQuery = useQuery({
    queryKey: ['chat', params.orderId ?? 'support', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (params.orderId) {
        return unwrap(await supabase.from('chats').select('*').eq('order_id', params.orderId).single());
      }
      const existing = unwrapMaybe(
        await supabase.from('chats').select('*').eq('type', 'support').eq('client_id', userId!).maybeSingle(),
      );
      if (existing) return existing;
      return unwrap(await supabase.from('chats').insert({ type: 'support', client_id: userId! }).select().single());
    },
  });
  const chatId = chatQuery.data?.id;

  const messages = useQuery({
    queryKey: ['messages', chatId],
    enabled: !!chatId,
    queryFn: async () =>
      unwrap(
        await supabase.from('chat_messages').select('*').eq('chat_id', chatId!).order('created_at'),
      ),
  });

  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(channelName(`chat-${chatId}`))
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` },
        (payload) =>
          qc.setQueryData<ChatMessage[]>(['messages', chatId], (old) => {
            const msg = payload.new as ChatMessage;
            if (old?.some((m) => m.id === msg.id)) return old;
            return [...(old ?? []), msg];
          }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, qc]);

  const send = useMutation({
    mutationFn: async (body: string) =>
      unwrap(
        await supabase.from('chat_messages').insert({ chat_id: chatId!, sender_id: userId!, body }).select().single(),
      ),
    onSuccess: (msg) =>
      qc.setQueryData<ChatMessage[]>(['messages', chatId], (old) =>
        old?.some((m) => m.id === msg.id) ? old : [...(old ?? []), msg],
      ),
  });

  // participants of an order chat, to label who wrote each message
  const participants = useQuery({
    queryKey: ['chat_participants', params.orderId],
    enabled: !!params.orderId,
    queryFn: async () =>
      unwrapMaybe(
        await supabase.from('orders').select('client_id, courier_id').eq('id', params.orderId!).maybeSingle(),
      ),
  });

  return {
    chat: chatQuery.data,
    messages: messages.data ?? [],
    loading: chatQuery.isLoading,
    send,
    participants: participants.data ?? null,
  };
}
