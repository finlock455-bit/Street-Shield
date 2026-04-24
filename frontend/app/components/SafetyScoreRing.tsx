import React from 'react';
import { View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';
import type { SafetyAnalysis } from '../types';

interface SafetyScoreRingProps {
  safetyAnalysis: SafetyAnalysis;
  pulseAnim: Animated.Value;
  rotateAnim: Animated.Value;
  glowAnim: Animated.Value;
  getSafetyColor: (score: number) => string;
  getSafetyLabel: (score: number) => string;
}

export const SafetyScoreRing: React.FC<SafetyScoreRingProps> = ({
  safetyAnalysis, pulseAnim, rotateAnim, glowAnim, getSafetyColor, getSafetyLabel
}) => {
  const score = safetyAnalysis.safety_score.overall_score;
  const color = getSafetyColor(score);

  return (
    <View style={styles.safetyScoreContainer}>
      <View style={styles.safetyScoreWrapper}>
        <Animated.View style={[styles.pulseRing, {
          opacity: pulseAnim,
          transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
        }]}>
          <View style={[styles.pulseRingInner, { borderColor: color }]} />
        </Animated.View>
        <Animated.View style={[styles.scoreGlowRing, {
          opacity: glowAnim,
          borderColor: color,
        }]} />
        <View style={[styles.safetyScoreCircle, { borderColor: color }]}>
          <Text style={[styles.safetyScoreNumber, { color }]}>{score}</Text>
          <Text style={[styles.safetyScoreLabel, { color }]}>{getSafetyLabel(score)}</Text>
        </View>
      </View>
      <View style={styles.statusIndicators}>
        <View style={styles.statusItem}>
          <Ionicons name="eye" size={16} color="#00ffff" />
          <Text style={styles.statusText}>SCANNING</Text>
        </View>
        <View style={styles.statusItem}>
          <Ionicons name="pulse" size={16} color="#ff0066" />
          <Text style={styles.statusText}>ANALYZING</Text>
        </View>
        <View style={styles.statusItem}>
          <Ionicons name="shield" size={16} color="#00ffcc" />
          <Text style={styles.statusText}>SHIELDED</Text>
        </View>
      </View>
    </View>
  );
};
