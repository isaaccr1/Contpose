import { View, Image, StyleSheet } from 'react-native';

const logoSource = require('../assets/images/Logo.png');

export function Logo() {
  return (
    <View style={styles.logoContainer}>
      <Image source={logoSource} style={styles.logoImage} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 300,
    height: 190,
    marginBottom: 12,
  },
});
