import { View } from 'react-native';
import { Skeleton, spacing } from '@marketplace/mobile';

export function ProductGridSkeleton() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={{ width: '50%', padding: spacing.xs + 2 }}>
          <Skeleton style={{ height: 240, borderRadius: 20 }} />
        </View>
      ))}
    </View>
  );
}
