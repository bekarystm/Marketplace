import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { errorMessage, type Database } from '@marketplace/shared';
import { Button, RadioRow, SectionTitle, TextField, colors, font, radius, spacing, useAuth, useI18n } from '@marketplace/mobile';
import { uploadCourierDoc, useMyCourier, useSubmitCourierApplication } from '../../src/lib/api';

type Vehicle = Database['public']['Enums']['vehicle_type'];
const VEHICLES: Vehicle[] = ['foot', 'bicycle', 'scooter', 'car'];

function PhotoPicker({ label, uri, onPick }: { label: string; uri: string | null; onPick: (uri: string) => void }) {
  const pick = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    const result = perm.granted
      ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ['images'] });
    if (!result.canceled && result.assets[0]) onPick(result.assets[0].uri);
  };
  return (
    <Pressable style={styles.photo} onPress={pick}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={{ fontSize: 32 }}>📷</Text>}
      <Text style={styles.photoLabel}>{label}</Text>
    </Pressable>
  );
}

export default function CourierApply() {
  const { t, locale } = useI18n();
  const { userId } = useAuth();
  const { data: existing } = useMyCourier();
  const submit = useSubmitCourierApplication();
  const [vehicle, setVehicle] = useState<Vehicle>(existing?.vehicle ?? 'foot');
  const [iin, setIin] = useState(existing?.iin ?? '');
  const [doc, setDoc] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = /^\d{12}$/.test(iin) && !!doc && !!selfie;

  const onSubmit = async () => {
    if (!userId || !doc || !selfie) return;
    setBusy(true);
    try {
      const [documentPath, selfiePath] = await Promise.all([
        uploadCourierDoc(userId, doc, 'document'),
        uploadCourierDoc(userId, selfie, 'selfie'),
      ]);
      await submit.mutateAsync({ vehicle, iin, documentPath, selfiePath, exists: !!existing });
      router.replace('/courier');
    } catch (e) {
      Alert.alert(t('common.error'), errorMessage(e, locale));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <SectionTitle>{t('courier.vehicle')}</SectionTitle>
      {VEHICLES.map((v) => (
        <RadioRow key={v} label={t(`vehicle.${v}` as const)} selected={vehicle === v} onPress={() => setVehicle(v)} />
      ))}
      <TextField label={t('courier.iin')} value={iin} onChangeText={(s) => setIin(s.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={12} />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <PhotoPicker label={t('courier.documentPhoto')} uri={doc} onPick={setDoc} />
        <PhotoPicker label={t('courier.selfie')} uri={selfie} onPick={setSelfie} />
      </View>
      <Button title={t('courier.submit')} onPress={onSubmit} disabled={!valid} loading={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  photo: {
    flex: 1, aspectRatio: 0.8, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  photoLabel: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.sm, textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)', fontSize: font.sm,
  },
});
