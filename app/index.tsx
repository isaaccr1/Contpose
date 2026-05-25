import { useEffect, useRef, useState } from "react";
import { Animated, Image, Modal, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { router } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

const navItems = [
  { key: 'home', label: 'Inicio', icon: 'home-outline' },
  { key: 'camera', label: 'Cámara', icon: 'camera-outline' },
  { key: 'history', label: 'Historial', icon: 'bar-chart-outline' },
  { key: 'profile', label: 'Perfil', icon: 'person-outline' },
] as const;

const getLogoSize = (size: number = 28) => ({
  width: size,
  height: size,
});

export default function Home() {
  const { session, loading } = useAuth();
  const [modalTitle, setModalTitle] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const androidTopInset = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

  const topBarY = useRef(new Animated.Value(-40)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const heroY = useRef(new Animated.Value(40)).current;
  const card1Y = useRef(new Animated.Value(40)).current;
  const card2Y = useRef(new Animated.Value(40)).current;
  const navY = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/signin");
    }

    if (session) {
      Animated.sequence([
        Animated.timing(topBarY, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.stagger(80, [
            Animated.timing(heroY, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(card1Y, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(card2Y, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(navY, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [session, loading, topBarY, contentOpacity, heroY, card1Y, card2Y, navY]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return null;
  }

  const rawName = session.user.user_metadata?.name ?? session.user.email?.split('@')[0] ?? 'Usuario';
  const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  const openBlank = (title: string, tabKey?: string) => {
    if (tabKey) setActiveTab(tabKey);
    setModalTitle(title);
  };

  const handleNavPress = (item: typeof navItems[number]) => {
    if (item.key === 'profile') {
      router.push('/profile');
      setActiveTab(item.key);
      return;
    }

    openBlank(item.label, item.key);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/signin');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.topBar, { paddingTop: 14 + androidTopInset, transform: [{ translateY: topBarY }] }] }>
        <View style={styles.brandRow}>
          <View style={styles.topLogoWrapper}>
            <Image source={require('../assets/images/Logo.png')} style={[styles.topLogo, getLogoSize(140)]} resizeMode="contain" />
          </View>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => openBlank('Notificaciones')} style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.logoutButtonText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View style={[styles.content, { opacity: contentOpacity }] }>
        <Text style={styles.welcomeText}>¡Bienvenido, {userName}!</Text>

        <Animated.View style={[styles.heroCard, { transform: [{ translateY: heroY }] }] }>
          <View style={styles.heroImagePlaceholder}>
            <Ionicons name="body-outline" size={40} color="#ffffff" />
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>Empieza tu Entrenamiento</Text>
            <Text style={styles.heroSubtitle}>Un camino más fuerte hacia una mejor postura.</Text>
            <TouchableOpacity style={styles.heroButton} onPress={() => openBlank('Entrenamiento')}>
              <Text style={styles.heroButtonText}>¡Comenzar!</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View style={{ transform: [{ translateY: card1Y }] }}>
          <TouchableOpacity style={styles.card} onPress={() => openBlank('Consejos Posturales')}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="bulb-outline" size={20} color="#fff" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Consejos Posturales</Text>
              <Text style={styles.cardSubtitle}>Mejora tu postura con nuestros tips.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#1e3a8a" />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ translateY: card2Y }] }}>
          <TouchableOpacity style={styles.card} onPress={() => openBlank('Progreso Semanal')}>
            <View style={styles.cardIconContainerSecondary}>
              <Ionicons name="trending-up-outline" size={20} color="#fff" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Progreso Semanal</Text>
              <Text style={styles.cardSubtitle}>78% de tu meta semanal alcanzada.</Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>78%</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.bottomNav, { transform: [{ translateY: navY }] }] }>
        {navItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.navItem}
            onPress={() => handleNavPress(item)}
          >
            <Ionicons
              name={item.icon as any}
              size={24}
              color={activeTab === item.key ? '#1e3a8a' : '#94a3b8'}
            />
            <Text style={[styles.navLabel, activeTab === item.key && styles.navLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      <Modal
        visible={!!modalTitle}
        animationType="slide"
        transparent
        onRequestClose={() => setModalTitle(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalDescription}>Pantalla en blanco</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalTitle(null)}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef4ff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Roboto',
    color: '#fff',
  },
  topBar: {
    backgroundColor: '#1f239c',
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topLogoWrapper: {
    width: 70,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topLogo: {
    width: 70,
    height: 38,
  },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  brandText: {
    color: '#fff',
    fontFamily: 'RobotoBold',
    fontSize: 20,
  },
  iconButton: {
    padding: 6,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Roboto',
    marginLeft: 6,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 90,
  },
  welcomeText: {
    fontSize: 24,
    fontFamily: 'RobotoBold',
    color: '#1e293b',
    marginBottom: 18,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: '#1e3a8a',
    overflow: 'hidden',
    marginBottom: 18,
    minHeight: 200,
  },
  heroImagePlaceholder: {
    backgroundColor: '#1d4ed8',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {
    padding: 20,
  },
  heroTitle: {
    fontSize: 22,
    color: '#fff',
    fontFamily: 'RobotoBold',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#c7d2fe',
    marginBottom: 16,
    lineHeight: 20,
  },
  heroButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  heroButtonText: {
    color: '#fff',
    fontFamily: 'RobotoBold',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardIconContainerSecondary: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'RobotoBold',
    color: '#1e293b',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  progressBadge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  progressBadgeText: {
    fontSize: 14,
    fontFamily: 'RobotoBold',
    color: '#1e3a8a',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 20,
    elevation: 10,
  },
  navItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 12,
    fontFamily: 'Roboto',
    color: '#94a3b8',
    marginTop: 4,
  },
  navLabelActive: {
    color: '#1e3a8a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    minHeight: 240,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'RobotoBold',
    color: '#0f172a',
    marginBottom: 14,
  },
  modalDescription: {
    fontSize: 14,
    fontFamily: 'Roboto',
    color: '#475569',
    marginBottom: 24,
  },
  closeButton: {
    backgroundColor: '#1e3a8a',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontFamily: 'RobotoBold',
    fontSize: 16,
  },
});