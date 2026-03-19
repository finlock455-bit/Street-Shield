import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Dimensions,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface JourneyData {
  activityType: string;
  distanceKm: number;
  durationMinutes: number;
  avgSafetyScore: number;
  steps: number;
  avgHeartRate: number;
  routePoints: { latitude: number; longitude: number }[];
  completedAt: string;
  shareToken?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  journeyData: JourneyData;
}

const ACTIVITY_ICONS: Record<string, string> = {
  walking: 'walk',
  running: 'fitness',
  cycling: 'bicycle',
};

const ACTIVITY_LABELS: Record<string, string> = {
  walking: 'Walk',
  running: 'Run',
  cycling: 'Ride',
};

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getSafetyGrade(score: number): { grade: string; color: string; label: string } {
  if (score >= 80) return { grade: 'A+', color: '#00C853', label: 'Excellent' };
  if (score >= 60) return { grade: 'B', color: '#FFD600', label: 'Good' };
  if (score >= 40) return { grade: 'C', color: '#FF9100', label: 'Fair' };
  return { grade: 'D', color: '#FF1744', label: 'Caution' };
}

function RouteMap({ points, theme }: { points: { latitude: number; longitude: number }[]; theme: 'light' | 'dark' }) {
  if (points.length < 2) {
    return (
      <View style={[mapStyles.placeholder, theme === 'dark' && mapStyles.placeholderDark]}>
        <Ionicons name="navigate" size={32} color={theme === 'dark' ? '#4ECDC4' : '#667eea'} />
        <Text style={[mapStyles.placeholderText, theme === 'dark' && mapStyles.placeholderTextDark]}>
          Route tracked
        </Text>
      </View>
    );
  }

  const MAP_W = SCREEN_WIDTH - 80;
  const MAP_H = 140;
  const PAD = 16;

  const lats = points.map(p => p.latitude);
  const lons = points.map(p => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const rangeX = maxLon - minLon || 0.001;
  const rangeY = maxLat - minLat || 0.001;

  const svgPoints = points.map(p => {
    const x = PAD + ((p.longitude - minLon) / rangeX) * (MAP_W - 2 * PAD);
    const y = PAD + ((maxLat - p.latitude) / rangeY) * (MAP_H - 2 * PAD);
    return `${x},${y}`;
  }).join(' ');

  const startPt = points[0];
  const endPt = points[points.length - 1];
  const startX = PAD + ((startPt.longitude - minLon) / rangeX) * (MAP_W - 2 * PAD);
  const startY = PAD + ((maxLat - startPt.latitude) / rangeY) * (MAP_H - 2 * PAD);
  const endX = PAD + ((endPt.longitude - minLon) / rangeX) * (MAP_W - 2 * PAD);
  const endY = PAD + ((maxLat - endPt.latitude) / rangeY) * (MAP_H - 2 * PAD);

  const lineColor = theme === 'dark' ? '#4ECDC4' : '#667eea';
  const bgColor = theme === 'dark' ? '#141428' : '#f0f2ff';

  return (
    <View style={[mapStyles.container, { backgroundColor: bgColor }]}>
      <Svg width={MAP_W} height={MAP_H}>
        <Defs>
          <LinearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#00FF88" stopOpacity="0.8" />
            <Stop offset="1" stopColor={lineColor} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Polyline
          points={svgPoints}
          fill="none"
          stroke="url(#routeGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={startX} cy={startY} r="5" fill="#00FF88" />
        <Circle cx={endX} cy={endY} r="5" fill="#FF6B6B" />
        <Circle cx={endX} cy={endY} r="9" fill="none" stroke="#FF6B6B" strokeWidth="2" opacity="0.4" />
      </Svg>
      <View style={mapStyles.legend}>
        <View style={mapStyles.legendItem}>
          <View style={[mapStyles.legendDot, { backgroundColor: '#00FF88' }]} />
          <Text style={[mapStyles.legendText, theme === 'dark' && { color: '#aaa' }]}>Start</Text>
        </View>
        <View style={mapStyles.legendItem}>
          <View style={[mapStyles.legendDot, { backgroundColor: '#FF6B6B' }]} />
          <Text style={[mapStyles.legendText, theme === 'dark' && { color: '#aaa' }]}>Home</Text>
        </View>
      </View>
    </View>
  );
}

export default function JourneyShareCard({ visible, onClose, journeyData }: Props) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { grade, color: gradeColor, label: gradeLabel } = getSafetyGrade(journeyData.avgSafetyScore);

  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a1a' : '#ffffff';
  const cardBg = isDark ? '#141428' : '#f8f9ff';
  const textPrimary = isDark ? '#ffffff' : '#1a1a2e';
  const textSecondary = isDark ? '#aaaaaa' : '#666666';
  const accent = isDark ? '#4ECDC4' : '#667eea';
  const brandGreen = '#00FF88';

  const dateStr = journeyData.completedAt
    ? new Date(journeyData.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const timeStr = journeyData.completedAt
    ? new Date(journeyData.completedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const handleShare = async () => {
    const activityLabel = ACTIVITY_LABELS[journeyData.activityType] || 'Journey';
    const message = `I got home safe! My ${activityLabel.toLowerCase()} with Street Shield:\n\nSafety Score: ${journeyData.avgSafetyScore}/100 (${gradeLabel})\nDistance: ${journeyData.distanceKm.toFixed(2)} km\nDuration: ${formatDuration(journeyData.durationMinutes)}\nSteps: ${journeyData.steps.toLocaleString()}\n\nStay safe with Street Shield - your AI personal safety companion.\n#StreetShield #IGotHomeSafe #PersonalSafety`;

    try {
      if (Platform.OS === 'web' && navigator.share) {
        await navigator.share({ title: 'I Got Home Safe - Street Shield', text: message });
      } else {
        await Share.share({ message, title: 'I Got Home Safe - Street Shield' });
      }
    } catch (err) {
      console.log('Share cancelled or failed');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.wrapper, { backgroundColor: bg }]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} data-testid="journey-card-close">
            <Ionicons name="close" size={28} color={textPrimary} />
          </TouchableOpacity>
          <View style={styles.themeSwitcher}>
            <TouchableOpacity
              style={[styles.themeBtn, !isDark && styles.themeBtnActive]}
              onPress={() => setTheme('light')}
              data-testid="theme-light-btn"
            >
              <Ionicons name="sunny" size={16} color={!isDark ? '#fff' : textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeBtn, isDark && styles.themeBtnActiveDark]}
              onPress={() => setTheme('dark')}
              data-testid="theme-dark-btn"
            >
              <Ionicons name="moon" size={16} color={isDark ? '#fff' : textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: isDark ? '#222' : '#e8e8f0' }]}>
          {/* Header ribbon */}
          <View style={[styles.ribbon, { backgroundColor: brandGreen }]}>
            <Ionicons name="shield-checkmark" size={18} color="#0a0a1a" />
            <Text style={styles.ribbonText}>I GOT HOME SAFE</Text>
          </View>

          {/* Activity + Score Row */}
          <View style={styles.heroRow}>
            <View style={styles.activityBadge}>
              <Ionicons
                name={(ACTIVITY_ICONS[journeyData.activityType] || 'walk') as any}
                size={28}
                color={accent}
              />
              <Text style={[styles.activityLabel, { color: textPrimary }]}>
                {ACTIVITY_LABELS[journeyData.activityType] || 'Journey'}
              </Text>
            </View>
            <View style={[styles.scoreCircle, { borderColor: gradeColor }]}>
              <Text style={[styles.scoreGrade, { color: gradeColor }]}>{grade}</Text>
              <Text style={[styles.scoreNum, { color: textSecondary }]}>{journeyData.avgSafetyScore}</Text>
            </View>
          </View>

          {/* Route Map */}
          <RouteMap points={journeyData.routePoints} theme={theme} />

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatItem icon="navigate" label="Distance" value={`${journeyData.distanceKm.toFixed(2)} km`} color={accent} textColor={textPrimary} subColor={textSecondary} />
            <StatItem icon="time" label="Duration" value={formatDuration(journeyData.durationMinutes)} color={accent} textColor={textPrimary} subColor={textSecondary} />
            <StatItem icon="footsteps" label="Steps" value={journeyData.steps.toLocaleString()} color={accent} textColor={textPrimary} subColor={textSecondary} />
            <StatItem icon="heart" label="Avg HR" value={journeyData.avgHeartRate > 0 ? `${journeyData.avgHeartRate} bpm` : '--'} color="#E91E63" textColor={textPrimary} subColor={textSecondary} />
          </View>

          {/* Date + Brand */}
          <View style={styles.footer}>
            <Text style={[styles.dateText, { color: textSecondary }]}>{dateStr} at {timeStr}</Text>
            <View style={styles.brand}>
              <Ionicons name="shield-checkmark" size={14} color={brandGreen} />
              <Text style={[styles.brandText, { color: textSecondary }]}>Street Shield</Text>
            </View>
          </View>
        </View>

        {/* Share Button */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} data-testid="journey-share-btn">
          <Ionicons name="share-social" size={20} color="#0a0a1a" />
          <Text style={styles.shareBtnText}>Share My Journey</Text>
        </TouchableOpacity>

        <Text style={[styles.tagline, { color: textSecondary }]}>
          #IGotHomeSafe #StreetShield
        </Text>
      </View>
    </Modal>
  );
}

function StatItem({ icon, label, value, color, textColor, subColor }: {
  icon: string; label: string; value: string; color: string; textColor: string; subColor: string;
}) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: subColor }]}>{label}</Text>
    </View>
  );
}

const mapStyles = StyleSheet.create({
  container: { borderRadius: 12, overflow: 'hidden', marginVertical: 12 },
  placeholder: {
    height: 100, borderRadius: 12, backgroundColor: '#f0f2ff',
    alignItems: 'center', justifyContent: 'center',
  },
  placeholderDark: { backgroundColor: '#141428' },
  placeholderText: { color: '#667eea', fontSize: 12, marginTop: 6, fontWeight: '600' },
  placeholderTextDark: { color: '#4ECDC4' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: '#666' },
});

const styles = StyleSheet.create({
  wrapper: {
    flex: 1, paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 50,
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', marginBottom: 20, maxWidth: 400,
  },
  themeSwitcher: { flexDirection: 'row', borderRadius: 20, overflow: 'hidden' },
  themeBtn: { padding: 8, paddingHorizontal: 14, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 20 },
  themeBtnActive: { backgroundColor: '#667eea' },
  themeBtnActiveDark: { backgroundColor: '#4ECDC4' },
  card: {
    width: '100%', maxWidth: 400, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, paddingBottom: 16,
  },
  ribbon: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, gap: 8,
  },
  ribbonText: { fontWeight: '900', fontSize: 16, color: '#0a0a1a', letterSpacing: 2 },
  heroRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  activityBadge: { alignItems: 'center', gap: 4 },
  activityLabel: { fontSize: 18, fontWeight: '800' },
  scoreCircle: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreGrade: { fontSize: 22, fontWeight: '900' },
  scoreNum: { fontSize: 10, fontWeight: '600' },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12,
    justifyContent: 'space-between', gap: 8,
  },
  statItem: { alignItems: 'center', width: '22%', paddingVertical: 8 },
  statValue: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  statLabel: { fontSize: 10, marginTop: 2 },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12,
  },
  dateText: { fontSize: 11 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  brandText: { fontSize: 11, fontWeight: '700' },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#00FF88', paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 30, marginTop: 24,
  },
  shareBtnText: { fontWeight: '800', fontSize: 16, color: '#0a0a1a' },
  tagline: { marginTop: 12, fontSize: 13, fontStyle: 'italic' },
});
