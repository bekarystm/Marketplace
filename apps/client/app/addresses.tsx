import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useDeleteAddress } from '../src/lib/api';
import { useSelectedAddress } from '../src/lib/hooks';
import { useI18n } from '../src/lib/i18n';
import { Button, EmptyState } from '../src/components/ui';
import { colors, font, radius, spacing } from '../src/lib/theme';

export default function Addresses() {
  const { t } = useI18n();
  const { address: selected, addresses, select } = useSelectedAddress();
  const del = useDeleteAddress();

  return (
    <FlatList
      data={addresses}
      keyExtractor={(a) => a.id}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
      ListEmptyComponent={<EmptyState title={t('home.chooseAddress')} />}
      ListFooterComponent={<Button title={`+ ${t('checkout.addAddress')}`} onPress={() => router.push('/address/new')} />}
      renderItem={({ item }) => (
        <Pressable
          style={[styles.card, selected?.id === item.id && { borderColor: colors.primary }]}
          onPress={() => {
            select(item.id);
            router.back();
          }}
          onLongPress={() =>
            Alert.alert(item.address_line, undefined, [
              { text: t('common.cancel'), style: 'cancel' },
              { text: '🗑', style: 'destructive', onPress: () => del.mutate(item.id) },
            ])
          }
        >
          <Text style={styles.line}>{item.address_line}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {item.apartment ? <Text style={styles.meta}>{t('address.apartment')} {item.apartment}</Text> : null}
            {item.entrance ? <Text style={styles.meta}>{t('address.entrance')} {item.entrance}</Text> : null}
            {item.floor ? <Text style={styles.meta}>{t('address.floor')} {item.floor}</Text> : null}
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: 4 },
  line: { fontSize: font.md, fontWeight: '600', color: colors.text },
  meta: { fontSize: font.sm, color: colors.textMuted },
});
