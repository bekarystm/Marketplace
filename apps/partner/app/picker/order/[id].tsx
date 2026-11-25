import { useState } from 'react';
import { Alert, FlatList, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  errorMessage,
  formatMoney,
  formatPhone,
  formatQuantity,
  staffNextStatus,
  type OrderItem,
} from '@marketplace/shared';
import { Button, Card, Loading, Row, TextField, colors, font, radius, spacing, useI18n } from '@marketplace/mobile';
import { useOrderDetail, usePickItem, useStoreProductSearch, useUpdateStatus } from '../../../src/lib/api';

export default function PickerOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { data, isLoading } = useOrderDetail(id);
  const update = useUpdateStatus();
  const pick = usePickItem(id!);
  const [replaceFor, setReplaceFor] = useState<OrderItem | null>(null);
  const [weighFor, setWeighFor] = useState<OrderItem | null>(null);
  const [weight, setWeight] = useState('');
  const [search, setSearch] = useState('');
  const results = useStoreProductSearch(data?.order.store_id, search);

  if (isLoading || !data) return <Loading />;
  const { order, items, client } = data;
  const next = staffNextStatus(order.status);
  const picking = order.status === 'picking';
  // weighted goods need an actual weight, so "pick all" skips them
  const quickPickable = items.filter((i) => i.status === 'pending' && i.unit !== 'kg' && i.unit !== 'g');
  const pickAll = async () => {
    for (const item of quickPickable) {
      try {
        await pick.mutateAsync({ itemId: item.id, status: 'picked' });
      } catch (e) {
        onError(e);
        break;
      }
    }
  };
  const onError = (e: unknown) => Alert.alert(t('common.error'), errorMessage(e, locale));

  const nextLabel = next === 'accepted' ? t('picker.accept') : next === 'picking' ? t('picker.startPicking') : t('picker.markReady');

  const markPicked = (item: OrderItem) => {
    if (item.unit === 'kg' || item.unit === 'g') {
      setWeight(String(item.quantity));
      setWeighFor(item);
    } else {
      pick.mutate({ itemId: item.id, status: 'picked' }, { onError });
    }
  };

  const statusBadge = (item: OrderItem) => {
    switch (item.status) {
      case 'picked': return `✅ ${formatQuantity(item.picked_quantity ?? item.quantity, item.unit, locale)}`;
      case 'missing': return `❌ ${t('picker.missing')}`;
      case 'replaced':
        return `🔁 ${item.replacement_name} · ${
          item.replacement_approved == null ? t('picker.waitingClient') : item.replacement_approved ? '✓' : '✕'
        }`;
      default: return '';
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: t('orders.number', { number: order.number }) }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.md }}>
        <Text style={styles.status}>{t(`status.${order.status}` as const)}</Text>
        <Card style={{ gap: spacing.xs }}>
          <Text style={styles.bold}>{client?.full_name ?? ''}</Text>
          <Text style={styles.link} onPress={() => Linking.openURL(`tel:${order.contact_phone}`)}>{formatPhone(order.contact_phone)}</Text>
          <Text style={styles.muted}>{t('checkout.substitution')}: {t(`substitution.${order.substitution_policy}` as const)}</Text>
          {order.comment ? <Text style={styles.muted}>💬 {order.comment}</Text> : null}
          <Button variant="secondary" icon="chatbubbles-outline" title={t('orders.chat')} onPress={() => router.push(`/chat/${order.id}`)} />
        </Card>

        {picking && quickPickable.length > 1 ? (
          <Button variant="secondary" icon="checkmark-done" title={t('picker.pickAll', { count: quickPickable.length })} onPress={pickAll} loading={pick.isPending} />
        ) : null}

        {items.map((item) => (
          <Card key={item.id} style={{ gap: spacing.sm }}>
            <View style={styles.row}>
              <Text style={[styles.bold, { flex: 1 }]}>{item.name}</Text>
              <Text style={styles.bold}>{formatQuantity(item.quantity, item.unit, locale)}</Text>
            </View>
            <Text style={styles.muted}>{formatMoney(item.price)}</Text>
            {item.status !== 'pending' ? <Text>{statusBadge(item)}</Text> : null}
            {picking ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button style={styles.action} icon="checkmark" title={t('picker.picked')} onPress={() => markPicked(item)} />
                <Button style={styles.action} variant="secondary" icon="close" title={t('picker.missingShort')}
                  onPress={() => pick.mutate({ itemId: item.id, status: 'missing' }, { onError })} />
                {order.substitution_policy !== 'remove' ? (
                  <Button style={styles.action} variant="secondary" icon="swap-horizontal" title={t('picker.replace')} onPress={() => { setSearch(''); setReplaceFor(item); }} />
                ) : null}
              </View>
            ) : null}
          </Card>
        ))}

        <Card>
          <Row label={t('cart.items')} value={formatMoney(order.items_total)} />
          <Row label={t('cart.total')} value={formatMoney(order.total)} bold />
        </Card>
      </ScrollView>

      {next ? (
        <View style={styles.footer}>
          <Button
            title={nextLabel}
            loading={update.isPending}
            onPress={() => update.mutate({ orderId: order.id, status: next }, { onError })}
          />
        </View>
      ) : null}

      {/* actual weight */}
      <Modal visible={!!weighFor} transparent animationType="fade" onRequestClose={() => setWeighFor(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.bold}>{weighFor?.name}</Text>
            <TextField label={t('picker.actualWeight')} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" autoFocus />
            <Button
              title={t('common.save')}
              onPress={() => {
                const q = Number(weight.replace(',', '.'));
                if (!weighFor || !(q > 0)) return;
                pick.mutate({ itemId: weighFor.id, status: 'picked', pickedQuantity: q }, { onError });
                setWeighFor(null);
              }}
            />
            <Button variant="ghost" title={t('common.cancel')} onPress={() => setWeighFor(null)} />
          </View>
        </View>
      </Modal>

      {/* replacement search */}
      <Modal visible={!!replaceFor} animationType="slide" onRequestClose={() => setReplaceFor(null)}>
        <View style={{ flex: 1, padding: spacing.lg, paddingTop: spacing.xxl * 1.5, gap: spacing.md }}>
          <Text style={styles.bold}>{t('picker.chooseReplacement')}: {replaceFor?.name}</Text>
          <TextField value={search} onChangeText={setSearch} placeholder={t('common.search')} autoFocus />
          <FlatList
            data={results.data ?? []}
            keyExtractor={(p) => p.id}
            renderItem={({ item: p }) => (
              <Pressable
                style={styles.result}
                onPress={() => {
                  if (!replaceFor) return;
                  pick.mutate({ itemId: replaceFor.id, status: 'replaced', replacementProductId: p.id }, { onError });
                  setReplaceFor(null);
                }}
              >
                <Text style={{ flex: 1 }}>{p.name_ru}</Text>
                <Text style={styles.bold}>{formatMoney(p.price)}</Text>
              </Pressable>
            )}
          />
          <Button variant="secondary" title={t('common.cancel')} onPress={() => setReplaceFor(null)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  status: { fontSize: font.xl, fontWeight: '800', color: colors.primary },
  row: { flexDirection: 'row', gap: spacing.md },
  bold: { fontSize: font.md, fontWeight: '700', color: colors.text },
  muted: { fontSize: font.sm, color: colors.textMuted },
  link: { color: colors.primary, fontSize: font.md },
  action: { flex: 1, minHeight: 40, paddingHorizontal: spacing.xs },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingBottom: spacing.xl, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  result: { flexDirection: 'row', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: spacing.md },
});
