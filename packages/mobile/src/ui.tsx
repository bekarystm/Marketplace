import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND, colors, font, radius, shadow, spacing } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 22, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

/** Text logo: TDK in orange + FOOD in deep green. */
export function Logo({ size = 22, light }: { size?: number; light?: boolean }) {
  return (
    <Text style={{ fontSize: size, fontWeight: '900', letterSpacing: 0.5 }}>
      <Text style={{ color: colors.accent }}>{BRAND.first}</Text>
      <Text style={{ color: light ? colors.white : colors.primary }}>{BRAND.second}</Text>
    </Text>
  );
}

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const bg: Record<ButtonVariant, string> = {
    primary: colors.primary,
    accent: colors.accent,
    secondary: colors.surface,
    danger: colors.danger,
    ghost: 'transparent',
  };
  const fg =
    variant === 'secondary' ? colors.text : variant === 'ghost' ? colors.primary : colors.white;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg[variant], opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <Icon name={icon} size={18} color={fg} /> : null}
          <Text style={[styles.buttonText, { color: fg }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function TextField({ label, error, style, ...props }: TextInputProps & { label?: string; error?: string | null }) {
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? { borderColor: colors.danger } : null, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** Search input with a magnifier icon. */
export function SearchField(props: TextInputProps) {
  return (
    <View style={styles.search}>
      <Icon name="search" size={18} color={colors.textMuted} />
      <TextInput placeholderTextColor={colors.textMuted} style={styles.searchInput} {...props} />
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? { backgroundColor: colors.primary, borderColor: colors.primary } : null]}
    >
      <Text style={[styles.chipText, { color: active ? colors.white : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Small rounded label, e.g. "-25%". */
export function Badge({ label, tone = 'accent', style }: { label: string; tone?: 'accent' | 'primary' | 'muted'; style?: StyleProp<ViewStyle> }) {
  const map = {
    accent: { bg: colors.accentSoft, fg: colors.accentDark },
    primary: { bg: colors.primarySoft, fg: colors.primary },
    muted: { bg: colors.surface, fg: colors.textMuted },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }, style]}>
      <Text style={[styles.badgeText, { color: map.fg }]}>{label}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function EmptyState({ title, icon, action }: { title: string; icon?: IconName; action?: ReactNode }) {
  return (
    <View style={[styles.center, { gap: spacing.lg, padding: spacing.xl }]}>
      {icon ? (
        <View style={styles.emptyIcon}>
          <Icon name={icon} size={34} color={colors.primary} />
        </View>
      ) : null}
      <Text style={{ fontSize: font.lg, color: colors.textMuted, textAlign: 'center' }}>{title}</Text>
      {action}
    </View>
  );
}

export function Row({ label, value, bold, valueStyle }: { label: string; value: string; bold?: boolean; valueStyle?: StyleProp<TextStyle> }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowText, bold && styles.rowBold]}>{label}</Text>
      <Text style={[styles.rowText, bold && styles.rowBold, valueStyle]}>{value}</Text>
    </View>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{children}</Text>
      {action}
    </View>
  );
}

export function RadioRow({ label, selected, onPress, icon }: { label: string; selected: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} style={styles.radioRow}>
      {icon ? <Icon name={icon} size={20} color={selected ? colors.primary : colors.textMuted} /> : null}
      <Text style={{ fontSize: font.md, color: colors.text, flex: 1 }}>{label}</Text>
      <View style={[styles.radio, selected && { borderColor: colors.primary }]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  buttonText: { fontSize: font.md, fontWeight: '700' },
  label: { fontSize: font.sm, color: colors.textMuted, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: font.md,
    color: colors.text,
    backgroundColor: colors.card,
  },
  error: { fontSize: font.sm, color: colors.danger },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: font.md, color: colors.text },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: font.sm, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, ...shadow },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: font.xs, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  rowText: { fontSize: font.md, color: colors.text },
  rowBold: { fontWeight: '800', fontSize: font.lg },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.xl, marginBottom: spacing.md,
  },
  section: { fontSize: font.xl, fontWeight: '800', color: colors.text },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
