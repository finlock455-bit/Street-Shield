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
      Not a professional safety service or professional device.
    </Text>
    <TouchableOpacity onPress={onPrivacyPress} data-testid="privacy-policy-link">
      <Text style={styles.footerLink}>Privacy Policy</Text>
    </TouchableOpacity>
    <Text style={styles.footerVersion}>Street Shield v1.0.0</Text>
    <Text style={styles.footerDisclaimer}>
      Safety awareness tool for informational purposes only.
    </Text>
  </View>
);
