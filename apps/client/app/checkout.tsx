import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  calcCartTotals,
  errorMessage,
  formatMoney,
  type PaymentMethod,
  type SubstitutionPolicy,
} from '@marketplace/shared';
import { checkPromo, useAppSettings, useDeliverySlots, usePlaceOrder, useStore } from '../src/lib/api';
import { groupSlotsByDay, slotRange } from '@marketplace/shared';
import { useI18n } from '@marketplace/mobile';
import { useAuth } from '@marketplace/mobile';
import { useCartControls, useSelectedAddress } from '../src/lib/hooks';
import { Button, Card, Chip, RadioRow, Row, SectionTitle, TextField } from '@marketplace/mobile';
import { colors, font, spacing } from '@marketplace/mobile';

const POLICIES: SubstitutionPolicy[] = ['contact_me', 'replace_similar', 'remove'];

export default function Checkout() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { t, locale } = useI18n();
  const { profile } = useAuth();
  const { data: store } = useStore(storeId);
  const { data: settings } = useAppSettings();
  const { cart } = useCartControls();
  const { address, addresses, select } = useSelectedAddress();
  const placeOrder = usePlaceOrder();

  const [payment, setPayment] = useState<PaymentMethod>('cash');
  const [policy, setPolicy] = useState<SubstitutionPolicy>('contact_me');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [useBonus, setUseBonus] = useState(false);
  const [comment, setComment] = useState('');
  const { data: slots } = useDeliverySlots(storeId);
  const [when, setWhen] = useState<'asap' | 'slot'>('asap');
  const [slotId, setSlotId] = useState<string | null>(null);
  const slotGroups = groupSlotsByDay(slots ?? [], { today: t('checkout.today'), tomorrow: t('checkout.tomorrow') });

  const lines = cart
    .filter((c) => c.product.store_id === storeId)
    .map((r) => ({ product: r.product, quantity: Number(r.quantity) }));
  const totals = store
    ? calcCartTotals({
        lines,
        store,
        discount: promo?.discount ?? 0,
        bonusBalance: Number(profile?.bonus_balance ?? 0),
        useBonus,
        bonusMaxSpendPercent: Number(settings?.bonus_max_spend_percent ?? 50),
      })
    : null;

  const applyPromo = async () => {
    if (!totals || !storeId) return;
    setPromoError(null);
    try {
      const discount = await checkPromo(promoInput.trim(), storeId, totals.itemsTotal);
      setPromo({ code: promoInput.trim(), discount: Number(discount) });
    } catch (e) {
      setPromo(null);
      setPromoError(errorMessage(e, locale));
    }
  };

  const submit = async () => {
    if (!address || !storeId) return;
    try {
      const order = await placeOrder.mutateAsync({
        storeId,
        addressId: address.id,
        paymentMethod: payment,
        substitutionPolicy: policy,
        promoCode: promo?.code,
        useBonus,
        comment,
        slotId: when === 'slot' ? slotId : null,
      });
      router.dismissAll();
      router.push(`/order/${order.id}`);
    } catch (e) {
      Alert.alert(t('common.error'), errorMessage(e, locale));
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48 }}>
      <SectionTitle>{t('checkout.address')}</SectionTitle>
      <Card style={{ gap: spacing.xs }}>
        {addresses.map((a) => (
          <RadioRow key={a.id} label={a.address_line + (a.apartment ? `, кв. ${a.apartment}` : '')} selected={address?.id === a.id} onPress={() => select(a.id)} />
        ))}
        <Pressable onPress={() => router.push('/address/new')}>
          <Text style={styles.link}>+ {t('checkout.addAddress')}</Text>
        </Pressable>
      </Card>

      <SectionTitle>{t('checkout.when')}</SectionTitle>
      <Card>
        <RadioRow icon="flash-outline" label={t('checkout.asap')} selected={when === 'asap'} onPress={() => setWhen('asap')} />
        <RadioRow icon="time-outline" label={t('checkout.slot')} selected={when === 'slot'} onPress={() => setWhen('slot')} />
        {when === 'slot' ? (
          slotGroups.length === 0 ? (
            <Text style={styles.muted}>{t('checkout.noSlots')}</Text>
          ) : (
            <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
              {slotGroups.map((g) => (
                <View key={g.label} style={{ gap: spacing.sm }}>
                  <Text style={styles.dayLabel}>{g.label}</Text>
                  <View style={styles.slotWrap}>
                    {g.slots.map((sl) => (
                      <Chip key={sl.id} label={slotRange(sl)} active={slotId === sl.id} onPress={() => setSlotId(sl.id)} />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )
        ) : null}
      </Card>

      <SectionTitle>{t('checkout.payment')}</SectionTitle>
      <Card>
        <RadioRow icon="cash-outline" label={t('checkout.cash')} selected={payment === 'cash'} onPress={() => setPayment('cash')} />
        <RadioRow icon="card-outline" label={t('checkout.card')} selected={payment === 'card'} onPress={() => setPayment('card')} />
      </Card>

      <SectionTitle>{t('checkout.substitution')}</SectionTitle>
      <Card>
        {POLICIES.map((p) => (
          <RadioRow key={p} label={t(`substitution.${p}` as const)} selected={policy === p} onPress={() => setPolicy(p)} />
        ))}
      </Card>

      <SectionTitle>{t('checkout.promo')}</SectionTitle>
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <TextField value={promoInput} onChangeText={setPromoInput} autoCapitalize="characters" error={promoError} />
        </View>
        <Button title={t('checkout.applyPromo')} variant="secondary" onPress={applyPromo} disabled={!promoInput.trim()} />
      </View>

      {Number(profile?.bonus_balance ?? 0) > 0 ? (
        <View style={styles.bonusRow}>
          <Text style={{ fontSize: font.md, flex: 1 }}>
            {t('checkout.useBonus', { amount: formatMoney(profile?.bonus_balance) })}
          </Text>
          <Switch value={useBonus} onValueChange={setUseBonus} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.white} />
        </View>
      ) : null}

      <SectionTitle>{t('checkout.comment')}</SectionTitle>
      <TextField value={comment} onChangeText={setComment} multiline style={{ minHeight: 70 }} />

      {totals ? (
        <Card style={{ marginTop: spacing.xl }}>
          <Row label={t('cart.items')} value={formatMoney(totals.itemsTotal)} />
          <Row label={t('cart.delivery')} value={formatMoney(totals.deliveryFee)} />
          {totals.discount > 0 ? <Row label={t('cart.discount')} value={`−${formatMoney(totals.discount)}`} /> : null}
          {totals.bonus > 0 ? <Row label={t('cart.bonus')} value={`−${formatMoney(totals.bonus)}`} /> : null}
          <Row label={t('cart.total')} value={formatMoney(totals.total)} bold />
        </Card>
      ) : null}

      <Button
        variant="accent"
        style={{ marginTop: spacing.lg }}
        title={t('checkout.place', { amount: formatMoney(totals?.total ?? 0) })}
        disabled={!address || !totals?.canCheckout || (when === 'slot' && !slotId)}
        loading={placeOrder.isPending}
        onPress={submit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  muted: { fontSize: font.sm, color: colors.textMuted, marginTop: spacing.sm },
  dayLabel: { fontSize: font.sm, fontWeight: '700', color: colors.text },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  link: { color: colors.primary, fontSize: font.md, fontWeight: '600', paddingVertical: spacing.sm },
  bonusRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, gap: spacing.md },
});
