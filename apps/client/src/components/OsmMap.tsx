import { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView as RNWebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ComponentType, Ref } from 'react';

// react-native-webview's class typings conflict with React 19.3 types; narrow to what we use.
type WebViewHandle = { postMessage: (msg: string) => void };
const WebView = RNWebView as unknown as ComponentType<{
  ref?: Ref<WebViewHandle>;
  originWhitelist?: string[];
  source: { html: string };
  onLoadEnd?: () => void;
  onMessage?: (e: WebViewMessageEvent) => void;
  scrollEnabled?: boolean;
  style?: StyleProp<ViewStyle>;
}>;
import { colors } from '../lib/theme';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  kind: 'store' | 'home' | 'courier';
}

interface Props {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  /** Picker mode: a fixed pin in the centre, reports the centre after each move. */
  picker?: boolean;
  onCenterChange?: (c: { lat: number; lng: number }) => void;
  style?: StyleProp<ViewStyle>;
}

const EMOJI = { store: '🏪', home: '🏠', courier: '🛵' };

function buildHtml(center: { lat: number; lng: number }, zoom: number, picker: boolean) {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map{height:100%;margin:0;padding:0}
  .pin{position:absolute;left:50%;top:50%;transform:translate(-50%,-100%);font-size:38px;z-index:1000;pointer-events:none}
  .mk{font-size:28px;line-height:28px;text-align:center}
</style></head><body>
<div id="map"></div>${picker ? '<div class="pin">📍</div>' : ''}
<script>
  var map = L.map('map', { zoomControl: false, attributionControl: true }).setView([${center.lat}, ${center.lng}], ${zoom});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  var layer = L.layerGroup().addTo(map);
  var EMOJI = ${JSON.stringify(EMOJI)};
  function post(m){ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  map.on('moveend', function(){ var c = map.getCenter(); post({ type: 'center', lat: c.lat, lng: c.lng }); });
  function handle(raw){
    var msg; try { msg = JSON.parse(raw); } catch(e) { return; }
    if (msg.type === 'markers') {
      layer.clearLayers();
      var pts = [];
      msg.markers.forEach(function(m){
        L.marker([m.lat, m.lng], { icon: L.divIcon({ className: 'mk', html: EMOJI[m.kind] || '•', iconSize: [28, 28] }) }).addTo(layer);
        pts.push([m.lat, m.lng]);
      });
      if (msg.fit && pts.length > 1) map.fitBounds(pts, { padding: [40, 40] });
    }
    if (msg.type === 'center') map.setView([msg.lat, msg.lng], msg.zoom || map.getZoom());
  }
  document.addEventListener('message', function(e){ handle(e.data); });
  window.addEventListener('message', function(e){ handle(e.data); });
</script></body></html>`;
}

export function OsmMap({ center, zoom = 15, markers, picker = false, onCenterChange, style }: Props) {
  const ref = useRef<WebViewHandle>(null);
  const loaded = useRef(false);
  // build the page once; later changes are sent as messages
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => buildHtml(center, zoom, picker), []);
  const markersJson = JSON.stringify(markers ?? []);

  const sendMarkers = (fit: boolean) =>
    ref.current?.postMessage(JSON.stringify({ type: 'markers', markers: markers ?? [], fit }));

  useEffect(() => {
    if (loaded.current) sendMarkers(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markersJson]);

  useEffect(() => {
    if (loaded.current && picker) {
      ref.current?.postMessage(JSON.stringify({ type: 'center', lat: center.lat, lng: center.lng }));
    }
  }, [center.lat, center.lng, picker]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={{ color: colors.textMuted }}>Карта доступна в мобильном приложении</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        ref={ref}
        originWhitelist={['*']}
        source={{ html }}
        onLoadEnd={() => {
          loaded.current = true;
          sendMarkers(true);
        }}
        onMessage={(e: WebViewMessageEvent) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === 'center') onCenterChange?.({ lat: msg.lat, lng: msg.lng });
          } catch {
            /* ignore */
          }
        }}
        scrollEnabled={false}
        style={{ flex: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: colors.surface },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
});
