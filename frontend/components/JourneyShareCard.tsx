import React, { useState } from 'react';
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
import Svg, { Polyline, Circle, Defs, LinearGradient, Stop, Rect, Line, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CyclingMetrics {
  max_speed_kmh: number;
  avg_speed_kmh: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  max_elevation_m: number;
  min_elevation_m: number;
  elevation_profile: number[];
  cadence_avg: number;
  power_avg_watts: number;
  road_types: Record<string, number>;
  hazards_encountered: number;
  effort_score: number;
  cycling_safety_score: number;
}

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
  cyclingMetrics?: CyclingMetrics;
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

function getEffortLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Intense', color: '#FF1744' };
  if (score >= 60) return { label: 'Hard', color: '#FF9100' };
  if (score >= 40) return { label: 'Moderate', color: '#FFD600' };
  return { label: 'Easy', color: '#00C853' };
}

function RouteMap({ points, theme }: { points: { latitude: number; longitude: number }[]; theme: 'light' | 'dark' }) {
  if (points.length < 2) {
    return (
      <View style={[mapStyles.placeholder, theme === 'dark' && mapStyles.placeholderDark]}>
        <Ionicons name="navigate" size={28} color={theme === 'dark' ? '#4ECDC4' : '#667eea'} />
        <Text style={[mapStyles.placeholderText, theme === 'dark' && mapStyles.placeholderTextDark]}>Route tracked</Text>
      </View>
    );
  }

  const MAP_W = SCREEN_WIDTH - 80;
  const MAP_H = 120;
  const PAD = 16;

  const lats = points.map(p => p.latitude);
  const lons = points.map(p => p.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const rangeX = maxLon - minLon || 0.001;
  const rangeY = maxLat - minLat || 0.001;

  const svgPoints = points.map(p => {
    const x = PAD + ((p.longitude - minLon) / rangeX) * (MAP_W - 2 * PAD);
    const y = PAD + ((maxLat - p.latitude) / rangeY) * (MAP_H - 2 * PAD);
    return `${x},${y}`;
  }).join(' ');

  const sp = points[0], ep = points[points.length - 1];
  const sx = PAD + ((sp.longitude - minLon) / rangeX) * (MAP_W - 2 * PAD);
  const sy = PAD + ((maxLat - sp.latitude) / rangeY) * (MAP_H - 2 * PAD);
  const ex = PAD + ((ep.longitude - minLon) / rangeX) * (MAP_W - 2 * PAD);
  const ey = PAD + ((maxLat - ep.latitude) / rangeY) * (MAP_H - 2 * PAD);

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
        <Polyline points={svgPoints} fill="none" stroke="url(#routeGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={sx} cy={sy} r="5" fill="#00FF88" />
        <Circle cx={ex} cy={ey} r="5" fill="#FF6B6B" />
        <Circle cx={ex} cy={ey} r="9" fill="none" stroke="#FF6B6B" strokeWidth="2" opacity="0.4" />
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

function ElevationProfile({ profile, theme }: { profile: number[]; theme: 'light' | 'dark' }) {
  if (!profile || profile.length < 2) return null;

  const W = SCREEN_WIDTH - 80;
  const H = 80;
  const PAD = 8;

  const minE = Math.min(...profile);
  const maxE = Math.max(...profile);
  const range = maxE - minE || 1;

  const points = profile.map((e, i) => {
    const x = PAD + (i / (profile.length - 1)) * (W - 2 * PAD);
    const y = H - PAD - ((e - minE) / range) * (H - 2 * PAD);
    return `${x},${y}`;
  }).join(' ');

  // Create fill polygon
  const firstX = PAD;
  const lastX = PAD + (W - 2 * PAD);
  const fillPoints = `${firstX},${H - PAD} ${points} ${lastX},${H - PAD}`;

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#141428' : '#f8f0ff';
  const lineColor = isDark ? '#FF6B6B' : '#e74c3c';
  const fillColor = isDark ? 'rgba(255,107,107,0.15)' : 'rgba(231,76,60,0.1)';
  const textColor = isDark ? '#aaa' : '#666';

  return (
    <View style={[elevStyles.container, { backgroundColor: bgColor }]}>
      <View style={elevStyles.header}>
        <Ionicons name="trending-up" size={14} color={lineColor} />
        <Text style={[elevStyles.title, { color: isDark ? '#ccc' : '#333' }]}>Elevation</Text>
      </View>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity="0.3" />
            <Stop offset="1" stopColor={lineColor} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <Polyline points={fillPoints} fill="url(#elevGrad)" stroke="none" />
        <Polyline points={points} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Grid lines */}
        <Line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke={isDark ? '#333' : '#ddd'} strokeWidth="0.5" />
        <Line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={isDark ? '#333' : '#ddd'} strokeWidth="0.5" />
        {/* Labels */}
        <SvgText x={PAD + 2} y={PAD + 10} fontSize="8" fill={textColor}>{Math.round(maxE)}m</SvgText>
        <SvgText x={PAD + 2} y={H - PAD - 2} fontSize="8" fill={textColor}>{Math.round(minE)}m</SvgText>
      </Svg>
    </View>
  );
}

function EffortBar({ score, theme }: { score: number; theme: 'light' | 'dark' }) {
  const { label, color } = getEffortLabel(score);
  const isDark = theme === 'dark';

  return (
    <View style={effortStyles.container}>
      <View style={effortStyles.labelRow}>
        <Text style={[effortStyles.label, { color: isDark ? '#aaa' : '#666' }]}>Effort</Text>
        <Text style={[effortStyles.value, { color }]}>{label}</Text>
      </View>
      <View style={[effortStyles.track, { backgroundColor: isDark ? '#1a1a30' : '#e8e8f0' }]}>
        <View style={[effortStyles.fill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function RoadTypeBadges({ roadTypes, theme }: { roadTypes: Record<string, number>; theme: 'light' | 'dark' }) {
  const isDark = theme === 'dark';
  const icons: Record<string, { icon: string; label: string; color: string }> = {
    bike_lane: { icon: 'bicycle', label: 'Bike Lane', color: '#00C853' },
    road: { icon: 'car', label: 'Road', color: '#FF9100' },
    mixed: { icon: 'git-merge', label: 'Mixed', color: '#667eea' },
    trail: { icon: 'leaf', label: 'Trail', color: '#4CAF50' },
  };

  const sorted = Object.entries(roadTypes).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <View style={roadStyles.container}>
      {sorted.map(([type, pct]) => {
        const info = icons[type] || { icon: 'help-circle', label: type, color: '#999' };
        return (
          <View key={type} style={[roadStyles.badge, { backgroundColor: isDark ? '#1a1a30' : '#f0f0f8', borderColor: info.color + '40' }]}>
            <Ionicons name={info.icon as any} size={12} color={info.color} />
            <Text style={[roadStyles.badgeText, { color: isDark ? '#ccc' : '#333' }]}>{Math.round(pct * 100)}%</Text>
            <Text style={[roadStyles.badgeLabel, { color: isDark ? '#888' : '#999' }]}>{info.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function JourneyShareCard({ visible, onClose, journeyData }: Props) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const isCycling = journeyData.activityType === 'cycling';
  const cm = journeyData.cyclingMetrics;
  const safetyScore = isCycling && cm ? cm.cycling_safety_score : journeyData.avgSafetyScore;
  const { grade, color: gradeColor, label: gradeLabel } = getSafetyGrade(safetyScore);

  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a1a' : '#ffffff';
  const cardBg = isDark ? '#141428' : '#f8f9ff';
  const textPrimary = isDark ? '#ffffff' : '#1a1a2e';
  const textSecondary = isDark ? '#aaaaaa' : '#666666';
  const accent = isCycling ? (isDark ? '#FF6B6B' : '#e74c3c') : (isDark ? '#4ECDC4' : '#667eea');
  const brandGreen = '#00FF88';

  const dateStr = journeyData.completedAt
    ? new Date(journeyData.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = journeyData.completedAt
    ? new Date(journeyData.completedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const handleShare = async () => {
    let message: string;
    if (isCycling && cm) {
      message = `I got home safe! My ride with Street Shield:\n\nSafety Score: ${safetyScore}/100 (${gradeLabel})\nDistance: ${journeyData.distanceKm.toFixed(1)} km\nDuration: ${formatDuration(journeyData.durationMinutes)}\nAvg Speed: ${cm.avg_speed_kmh.toFixed(1)} km/h\nElevation: +${cm.elevation_gain_m}m / -${cm.elevation_loss_m}m\nEffort: ${getEffortLabel(cm.effort_score).label}\nHazards dodged: ${cm.hazards_encountered}\n\nStay safe cycling with Street Shield.\n#StreetShield #IGotHomeSafe #CyclingSafety`;
    } else {
      const activityLabel = journeyData.activityType === 'running' ? 'run' : 'walk';
      message = `I got home safe! My ${activityLabel} with Street Shield:\n\nSafety Score: ${safetyScore}/100 (${gradeLabel})\nDistance: ${journeyData.distanceKm.toFixed(2)} km\nDuration: ${formatDuration(journeyData.durationMinutes)}\nSteps: ${journeyData.steps.toLocaleString()}\n\nStay safe with Street Shield.\n#StreetShield #IGotHomeSafe #PersonalSafety`;
    }

    try {
      if (Platform.OS === 'web' && navigator.share) {
        await navigator.share({ title: 'I Got Home Safe - Street Shield', text: message });
      } else {
        await Share.share({ message, title: 'I Got Home Safe - Street Shield' });
      }
    } catch (err) {
      console.log('Share cancelled');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.wrapper, { backgroundColor: bg }]} data-testid="journey-share-modal">
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
          <View style={[styles.ribbon, { backgroundColor: isCycling ? accent : brandGreen }]}>
            <Ionicons name={isCycling ? 'bicycle' : 'shield-checkmark'} size={18} color={isCycling && !isDark ? '#fff' : '#0a0a1a'} />
            <Text style={[styles.ribbonText, isCycling && !isDark && { color: '#fff' }]}>
              {isCycling ? 'SAFE RIDE COMPLETE' : 'I GOT HOME SAFE'}
            </Text>
          </View>

          {/* Activity + Score Row */}
          <View style={styles.heroRow}>
            <View style={styles.activityBadge}>
              <Ionicons name={(ACTIVITY_ICONS[journeyData.activityType] || 'walk') as any} size={28} color={accent} />
              <Text style={[styles.activityLabel, { color: textPrimary }]}>
                {isCycling ? 'Ride' : journeyData.activityType === 'running' ? 'Run' : 'Walk'}
              </Text>
            </View>
            <View style={[styles.scoreCircle, { borderColor: gradeColor }]}>
              <Text style={[styles.scoreGrade, { color: gradeColor }]}>{grade}</Text>
              <Text style={[styles.scoreNum, { color: textSecondary }]}>{safetyScore}</Text>
            </View>
          </View>

          {/* Route Map */}
          <RouteMap points={journeyData.routePoints} theme={theme} />

          {/* Elevation Profile (cycling only) */}
          {isCycling && cm && cm.elevation_profile && cm.elevation_profile.length >= 2 && (
            <ElevationProfile profile={cm.elevation_profile} theme={theme} />
          )}

          {/* Stats Grid */}
          {isCycling && cm ? (
            <View>
              {/* Cycling primary stats */}
              <View style={styles.statsGrid}>
                <StatItem icon="speedometer" label="Avg Speed" value={`${cm.avg_speed_kmh.toFixed(1)}`} unit="km/h" color={accent} textColor={textPrimary} subColor={textSecondary} />
                <StatItem icon="flash" label="Max Speed" value={`${cm.max_speed_kmh.toFixed(1)}`} unit="km/h" color={accent} textColor={textPrimary} subColor={textSecondary} />
                <StatItem icon="navigate" label="Distance" value={`${journeyData.distanceKm.toFixed(1)}`} unit="km" color={accent} textColor={textPrimary} subColor={textSecondary} />
                <StatItem icon="time" label="Duration" value={formatDuration(journeyData.durationMinutes)} color={accent} textColor={textPrimary} subColor={textSecondary} />
              </View>
              {/* Cycling secondary stats */}
              <View style={styles.statsGrid}>
                <StatItem icon="trending-up" label="Elev Gain" value={`+${cm.elevation_gain_m}`} unit="m" color="#4CAF50" textColor={textPrimary} subColor={textSecondary} />
                <StatItem icon="sync" label="Cadence" value={`${cm.cadence_avg}`} unit="rpm" color="#9C27B0" textColor={textPrimary} subColor={textSecondary} />
                <StatItem icon="pulse" label="Power" value={`${cm.power_avg_watts}`} unit="W" color="#FF9800" textColor={textPrimary} subColor={textSecondary} />
                <StatItem icon="heart" label="Avg HR" value={journeyData.avgHeartRate > 0 ? `${journeyData.avgHeartRate}` : '--'} unit="bpm" color="#E91E63" textColor={textPrimary} subColor={textSecondary} />
              </View>
              {/* Effort bar */}
              <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
                <EffortBar score={cm.effort_score} theme={theme} />
              </View>
              {/* Road types */}
              {cm.road_types && Object.keys(cm.road_types).length > 0 && (
                <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                  <RoadTypeBadges roadTypes={cm.road_types} theme={theme} />
                </View>
              )}
              {/* Hazards */}
              {cm.hazards_encountered > 0 && (
                <View style={[styles.hazardBadge, { backgroundColor: isDark ? '#2a1a1a' : '#fff3e0' }]}>
                  <Ionicons name="warning" size={14} color="#FF9100" />
                  <Text style={[styles.hazardText, { color: isDark ? '#FFD600' : '#e65100' }]}>
                    {cm.hazards_encountered} hazard{cm.hazards_encountered !== 1 ? 's' : ''} navigated safely
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <StatItem icon="navigate" label="Distance" value={`${journeyData.distanceKm.toFixed(2)}`} unit="km" color={accent} textColor={textPrimary} subColor={textSecondary} />
              <StatItem icon="time" label="Duration" value={formatDuration(journeyData.durationMinutes)} color={accent} textColor={textPrimary} subColor={textSecondary} />
              <StatItem icon="footsteps" label="Steps" value={journeyData.steps.toLocaleString()} color={accent} textColor={textPrimary} subColor={textSecondary} />
              <StatItem icon="heart" label="Avg HR" value={journeyData.avgHeartRate > 0 ? `${journeyData.avgHeartRate}` : '--'} unit="bpm" color="#E91E63" textColor={textPrimary} subColor={textSecondary} />
            </View>
          )}

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
        <TouchableOpacity style={[styles.shareBtn, isCycling && { backgroundColor: accent }]} onPress={handleShare} data-testid="journey-share-btn">
          <Ionicons name="share-social" size={20} color={isCycling ? '#fff' : '#0a0a1a'} />
          <Text style={[styles.shareBtnText, isCycling && { color: '#fff' }]}>
            {isCycling ? 'Share My Ride' : 'Share My Journey'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.tagline, { color: textSecondary }]}>
          {isCycling ? '#IGotHomeSafe #CyclingSafety #StreetShield' : '#IGotHomeSafe #StreetShield'}
        </Text>
      </View>
    </Modal>
  );
}

function StatItem({ icon, label, value, unit, color, textColor, subColor }: {
  icon: string; label: string; value: string; unit?: string; color: string; textColor: string; subColor: string;
}) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon as any} size={16} color={color} />
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
        {unit && <Text style={[styles.statUnit, { color: subColor }]}>{unit}</Text>}
      </View>
      <Text style={[styles.statLabel, { color: subColor }]}>{label}</Text>
    </View>
  );
}

const elevStyles = StyleSheet.create({
  container: { borderRadius: 10, overflow: 'hidden', marginHorizontal: 12, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingTop: 6 },
  title: { fontSize: 11, fontWeight: '700' },
});

const effortStyles = StyleSheet.create({
  container: { marginBottom: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 10, fontWeight: '600' },
  value: { fontSize: 10, fontWeight: '800' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

const roadStyles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  badgeLabel: { fontSize: 9 },
});

const mapStyles = StyleSheet.create({
  container: { borderRadius: 10, overflow: 'hidden', marginHorizontal: 12, marginVertical: 6 },
  placeholder: { height: 80, borderRadius: 10, backgroundColor: '#f0f2ff', alignItems: 'center', justifyContent: 'center' },
  placeholderDark: { backgroundColor: '#141428' },
  placeholderText: { color: '#667eea', fontSize: 11, marginTop: 4, fontWeight: '600' },
  placeholderTextDark: { color: '#4ECDC4' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 9, color: '#666' },
});

const styles = StyleSheet.create({
  wrapper: { flex: 1, paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 16 : 50, alignItems: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12, maxWidth: 400 },
  themeSwitcher: { flexDirection: 'row', borderRadius: 20, overflow: 'hidden' },
  themeBtn: { padding: 8, paddingHorizontal: 14, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 20 },
  themeBtnActive: { backgroundColor: '#667eea' },
  themeBtnActiveDark: { backgroundColor: '#4ECDC4' },
  card: { width: '100%', maxWidth: 400, borderRadius: 20, overflow: 'hidden', borderWidth: 1, paddingBottom: 12 },
  ribbon: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 8 },
  ribbonText: { fontWeight: '900', fontSize: 14, color: '#0a0a1a', letterSpacing: 2 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  activityBadge: { alignItems: 'center', gap: 4 },
  activityLabel: { fontSize: 18, fontWeight: '800' },
  scoreCircle: { width: 58, height: 58, borderRadius: 29, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  scoreGrade: { fontSize: 20, fontWeight: '900' },
  scoreNum: { fontSize: 10, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, justifyContent: 'space-between', gap: 4, marginBottom: 4 },
  statItem: { alignItems: 'center', width: '23%', paddingVertical: 6 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 1, marginTop: 2 },
  statValue: { fontSize: 13, fontWeight: '800' },
  statUnit: { fontSize: 8, fontWeight: '600' },
  statLabel: { fontSize: 9, marginTop: 1 },
  hazardBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  hazardText: { fontSize: 11, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  dateText: { fontSize: 10 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  brandText: { fontSize: 10, fontWeight: '700' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#00FF88', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 30, marginTop: 16 },
  shareBtnText: { fontWeight: '800', fontSize: 16, color: '#0a0a1a' },
  tagline: { marginTop: 10, fontSize: 12, fontStyle: 'italic' },
});
