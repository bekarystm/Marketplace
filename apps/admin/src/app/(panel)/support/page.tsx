'use client';
import { useEffect, useRef, useState } from 'react';
import { formatPhone, type ChatMessage, channelName } from '@marketplace/shared';
import { supabase } from '@/lib/supabase';
import { useData, unwrap } from '@/lib/useData';
import { useSession } from '@/lib/session';
import { fmtDate } from '@/lib/labels';
import { Button, Card, Empty, Input, PageHeader } from '@/components/ui';

export default function SupportPage() {
  const { session } = useSession();
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const { data: chats } = useData(async () =>
    unwrap(await supabase.from('chats').select('id, created_at, client:profiles(full_name, phone)').eq('type', 'support').order('created_at', { ascending: false })), []);

  useEffect(() => {
    if (!active) return;
    supabase.from('chat_messages').select('*').eq('chat_id', active).order('created_at').then(({ data }) => setMessages(data ?? []));
    const ch = supabase.channel(channelName(`support-${active}`))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${active}` },
        (p) => setMessages((m) => (m.some((x) => x.id === (p.new as ChatMessage).id) ? m : [...m, p.new as ChatMessage])))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active]);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  const send = async () => {
    if (!active || !text.trim() || !session) return;
    const body = text.trim();
    setText('');
    const { data } = await supabase.from('chat_messages').insert({ chat_id: active, sender_id: session.user.id, body }).select().single();
    if (data) setMessages((m) => (m.some((x) => x.id === data.id) ? m : [...m, data]));
  };

  return (
    <>
      <PageHeader title="Поддержка" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="max-h-[70vh] space-y-1 overflow-y-auto p-2">
          {(chats ?? []).map((c) => (
            <button key={c.id} onClick={() => setActive(c.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${active === c.id ? 'bg-green-50' : 'hover:bg-stone-50'}`}>
              <div className="font-medium">{c.client?.full_name ?? 'Клиент'}</div>
              <div className="text-xs text-stone-500">{formatPhone(c.client?.phone)} · {fmtDate(c.created_at)}</div>
            </button>
          ))}
          {(chats ?? []).length === 0 ? <Empty>Обращений нет</Empty> : null}
        </Card>
        <Card className="flex h-[70vh] flex-col md:col-span-2">
          {active ? (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {messages.map((m) => {
                  const mine = m.sender_id === session?.user.id;
                  return (
                    <div key={m.id} className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${mine ? 'ml-auto bg-green-600 text-white' : 'bg-stone-100'}`}>
                      {m.body}
                      <div className={`text-right text-[10px] ${mine ? 'text-green-100' : 'text-stone-400'}`}>{fmtDate(m.created_at)}</div>
                    </div>
                  );
                })}
                <div ref={bottom} />
              </div>
              <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
                <Input className="flex-1" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ответ…" />
                <Button type="submit">Отправить</Button>
              </form>
            </>
          ) : <Empty>Выберите обращение</Empty>}
        </Card>
      </div>
    </>
  );
}
