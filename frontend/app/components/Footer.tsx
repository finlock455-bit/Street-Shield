import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles';

interface FooterProps {
  onPrivacyPress: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onPrivacyPress }) => (
  <View style={styles.footer}>
    <View style={styles.footerDivider} />
    <Text style={styles.footerDisclaimerBold}>
      This app is not a medical device or emergency service.
    </Text>
    <Text style={styles.footerDisclaimer}>
      It is intended for informational purposes only and should not be relied upon in situations requiring professional assistance. Always contact appropriate professional services when needed.
    </Text>
    <TouchableOpacity onPress={onPrivacyPress} data-testid="privacy-policy-link">
      <Text style={styles.footerLink}>Privacy Policy</Text>
    </TouchableOpacity>
    <Text style={styles.footerVersion}>Street Shield v1.0.0</Text>
  </View>
);
