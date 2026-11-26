import { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { EmptyState, FadeIn, Icon, PressableScale, colors, font, radius, shadow, spacing, useI18n } from '@marketplace/mobile';
import { useMarkNotificationsRead, useNotifications } from '../src/lib/api';

export default function Notifications() {
  const { t, locale } = useI18n();
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();

  // opening the list marks everything as read
  useEffect(() => {
    if (data?.some((n) => !n.read_at)) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.length]);

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={data ?? []}
      keyExtractor={(n) => n.id}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
      ListEmptyComponent={<EmptyState icon="notifications-outline" title={t('notifications.empty')} />}
      renderItem={({ item, index }) => {
        const orderId = (item.data as { order_id?: string } | null)?.order_id;
        return (
          <FadeIn index={index}>
            <PressableScale style={[styles.card, !item.read_at && styles.unread]} onPress={() => orderId && router.push(`/order/${orderId}`)}>
              <View style={styles.icon}><Icon name="receipt-outline" size={20} color={colors.primary} /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.title}>{item.title}</Text>
                {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
                <Text style={styles.time}>
                  {new Date(item.created_at).toLocaleString(locale === 'kk' ? 'kk-KZ' : 'ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              {!item.read_at ? <View style={styles.dot} /> : null}
            </PressableScale>
          </FadeIn>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, ...shadow },
  unread: { borderWidth: 1, borderColor: colors.accentSoft },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: font.md, fontWeight: '700', color: colors.text },
  body: { fontSize: font.sm, color: colors.text },
  time: { fontSize: font.xs, color: colors.textMuted, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, alignSelf: 'center' },
});
