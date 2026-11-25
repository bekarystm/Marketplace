import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { CITY, errorMessage } from '@marketplace/shared';
import { useSaveAddress } from '../../src/lib/api';
import { useSelectedAddress } from '../../src/lib/hooks';
import { useI18n } from '@marketplace/mobile';
import { reverseGeocode } from '@marketplace/mobile';
import { OsmMap } from '@marketplace/mobile';
import { Button, TextField } from '@marketplace/mobile';
import { spacing } from '@marketplace/mobile';

export default function NewAddress() {
  const { t, locale } = useI18n();
  const save = useSaveAddress();
  const { addresses, select } = useSelectedAddress();
  const [center, setCenter] = useState(CITY.center);
  const [mapCenter, setMapCenter] = useState(CITY.center);
  const [line, setLine] = useState('');
  const [entrance, setEntrance] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [intercom, setIntercom] = useState('');
  const [comment, setComment] = useState('');
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCenterChange = (c: { lat: number; lng: number }) => {
    setMapCenter(c);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      const label = await reverseGeocode(c.lat, c.lng);
      if (label) setLine(label);
    }, 800);
  };

  const useMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    setCenter(c);
    onCenterChange(c);
  };

  useEffect(() => {
    useMyLocation().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    try {
      const a = await save.mutateAsync({
        label: null,
        address_line: line.trim(),
        lat: mapCenter.lat,
        lng: mapCenter.lng,
        entrance: entrance || null,
        floor: floor || null,
        apartment: apartment || null,
        intercom: intercom || null,
        comment: comment || null,
        is_default: addresses.length === 0,
      });
      select(a.id);
      router.back();
    } catch (e) {
      Alert.alert(t('common.error'), errorMessage(e, locale));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <OsmMap center={center} zoom={16} picker onCenterChange={onCenterChange} style={{ height: 300 }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Button variant="secondary" title={`📍 ${t('address.useMyLocation')}`} onPress={useMyLocation} />
        <TextField label={t('address.line')} value={line} onChangeText={setLine} />
        <View style={styles.grid}>
          <View style={styles.cell}><TextField label={t('address.apartment')} value={apartment} onChangeText={setApartment} /></View>
          <View style={styles.cell}><TextField label={t('address.entrance')} value={entrance} onChangeText={setEntrance} /></View>
        </View>
        <View style={styles.grid}>
          <View style={styles.cell}><TextField label={t('address.floor')} value={floor} onChangeText={setFloor} /></View>
          <View style={styles.cell}><TextField label={t('address.intercom')} value={intercom} onChangeText={setIntercom} /></View>
        </View>
        <TextField label={t('address.comment')} value={comment} onChangeText={setComment} />
        <Button title={t('common.save')} onPress={submit} disabled={!line.trim()} loading={save.isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: spacing.md },
  cell: { flex: 1 },
});
