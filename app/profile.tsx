import { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, Modal, StyleSheet, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

const recentWorkouts = [
  {
    id: '1',
    title: 'Rutina de fuerza general',
    date: '28 de abril',
    description: 'Trabajo de piernas y core con foco en postura.',
    score: '82% de precisión',
  },
  {
    id: '2',
    title: 'Sesión de movilidad',
    date: '26 de abril',
    description: 'Estiramientos dinámicos y corrección postural.',
    score: '90% de estabilidad',
  },
  {
    id: '3',
    title: 'Entrenamiento de espalda',
    date: '24 de abril',
    description: 'Ejercicios de postura y alineación de hombros.',
    score: '78% de consistencia',
  },
];

export default function Profile() {
  const { session, loading } = useAuth();
  const [showResults, setShowResults] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [avatarUpdating, setAvatarUpdating] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(session?.user.user_metadata?.avatar_url ?? null);

  const uploadAvatar = async (userId: string, uri: string) => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = decode(base64);
    const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const filePath = `${userId}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        upsert: true,
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return {
      avatarPath: filePath,
      avatarUrl: `${data.publicUrl}?t=${Date.now()}`,
    };
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galeria para seleccionar una foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      await updateAvatar(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu camara para tomar una foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      await updateAvatar(result.assets[0].uri);
    }
  };

  const openAvatarOptions = () => {
    Alert.alert('Foto de perfil', 'Selecciona una opcion', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Camara', onPress: takePhoto },
      { text: 'Galeria', onPress: pickFromLibrary },
    ]);
  };

  const updateAvatar = async (uri: string) => {
    if (!session) return;

    try {
      setAvatarUpdating(true);
      setAvatarError(null);

      const avatar = await uploadAvatar(session.user.id, uri);
      const { error: updateUserError } = await supabase.auth.updateUser({
        data: {
          ...session.user.user_metadata,
          avatar_url: avatar.avatarUrl,
          avatar_path: avatar.avatarPath,
        },
      });

      if (updateUserError) {
        throw updateUserError;
      }

      setAvatarUrl(avatar.avatarUrl);
    } catch (error) {
      setAvatarError((error as { message?: string })?.message ?? 'No se pudo actualizar la foto de perfil.');
    } finally {
      setAvatarUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!session) return;

    setDeleting(true);
    setDeleteError(null);

    const userId = session.user.id;
    const deleteUserTableData = async (table: string) => {
      const { error } = await supabase.from(table).delete().eq('user_id', userId);
      if (error && error.code !== 'PGRST205') {
        throw error;
      }
    };

    try {
      await deleteUserTableData('todos');
      await deleteUserTableData('workouts');

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;

      router.replace('/signin');
    } catch (error) {
      console.error('Error al eliminar cuenta:', error);
      setDeleteError((error as { message?: string })?.message ?? 'No se pudo eliminar la cuenta.');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading || !session) {
    return null;
  }

  const metadata = session.user.user_metadata ?? {};
  const rawName = metadata.name ?? session.user.email?.split('@')[0] ?? 'Usuario';
  const userName = String(rawName).charAt(0).toUpperCase() + String(rawName).slice(1);
  const email = session.user.email ?? 'No disponible';
  const weight = metadata.weight ? `${metadata.weight} kg` : 'No registrado';
  const height = metadata.height ? `${metadata.height} cm` : 'No registrado';
  const age = metadata.age ? `${metadata.age} años` : 'No registrado';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/') }>
            <Ionicons name="arrow-back-outline" size={22} color="#1e40af" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Perfil</Text>
            <Text style={styles.subtitle}>Tus datos y el progreso reciente.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Información personal</Text>
          <View style={styles.avatarSection}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={34} color="#64748b" />
              </View>
            )}
            <TouchableOpacity style={styles.avatarActionButton} onPress={openAvatarOptions} disabled={avatarUpdating}>
              <Text style={styles.avatarActionButtonText}>{avatarUpdating ? 'Actualizando...' : 'Cambiar foto'}</Text>
            </TouchableOpacity>
          </View>
          {avatarError ? <Text style={styles.errorText}>{avatarError}</Text> : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nombre</Text>
            <Text style={styles.infoValue}>{userName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Correo</Text>
            <Text style={styles.infoValue}>{email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Edad</Text>
            <Text style={styles.infoValue}>{age}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Peso</Text>
            <Text style={styles.infoValue}>{weight}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Altura</Text>
            <Text style={styles.infoValue}>{height}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={() => setConfirmDelete(true)}>
          <Text style={styles.deleteButtonText}>Eliminar cuenta y datos</Text>
        </TouchableOpacity>
        {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}

        <TouchableOpacity style={styles.recentButton} onPress={() => setShowResults(true)}>
          <Text style={styles.recentButtonText}>Entrenamientos recientes</Text>
        </TouchableOpacity>

        <Modal
          visible={confirmDelete}
          animationType="slide"
          transparent
          onRequestClose={() => setConfirmDelete(false)}
        >
          <View style={styles.modalOverlay}> 
            <View style={styles.confirmModal}>
              <Text style={styles.confirmTitle}>Eliminar cuenta</Text>
              <Text style={styles.confirmText}>
                Esta acción borrará tu cuenta y los datos guardados en la aplicación. ¿Deseas continuar?
              </Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setConfirmDelete(false)}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmButton, deleting && styles.disabledButton]} onPress={handleDeleteAccount} disabled={deleting}>
                  <Text style={styles.confirmButtonText}>{deleting ? 'Eliminando...' : 'Eliminar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showResults}
          animationType="slide"
          transparent
          onRequestClose={() => setShowResults(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Entrenamientos recientes</Text>
              <Text style={styles.modalDescription}>Pantalla en blanco</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowResults(false)}>
                <Text style={styles.closeButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef4ff',
  },
  container: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 180,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 30,
    fontFamily: 'RobotoBold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Roboto',
    color: '#475569',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 20,
    paddingBottom: 28,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: 'RobotoBold',
    color: '#0f172a',
    marginBottom: 14,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 18,
    gap: 10,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  avatarActionButton: {
    backgroundColor: '#dbeafe',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  avatarActionButtonText: {
    color: '#1d4ed8',
    fontFamily: 'RobotoBold',
    fontSize: 13,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Roboto',
    color: '#64748b',
  },
  infoValue: {
    fontSize: 15,
    fontFamily: 'RobotoBold',
    color: '#0f172a',
  },
  deleteButton: {
    marginTop: 36,
    backgroundColor: '#dc2626',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontFamily: 'RobotoBold',
    fontSize: 16,
  },
  errorText: {
    marginTop: 12,
    color: '#b91c1c',
    fontSize: 14,
    fontFamily: 'Roboto',
  },
  recentButton: {
    marginTop: 36,
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  recentButtonText: {
    color: '#ffffff',
    fontFamily: 'RobotoBold',
    fontSize: 16,
  },
  confirmModal: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    margin: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 10,
  },
  confirmTitle: {
    fontSize: 20,
    fontFamily: 'RobotoBold',
    color: '#0f172a',
    marginBottom: 10,
  },
  confirmText: {
    fontSize: 15,
    fontFamily: 'Roboto',
    color: '#475569',
    lineHeight: 22,
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#1e293b',
    fontFamily: 'RobotoBold',
    fontSize: 15,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontFamily: 'RobotoBold',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  resultsModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '75%',
  },
  resultsModalTitle: {
    fontSize: 18,
    fontFamily: 'RobotoBold',
    color: '#0f172a',
    marginBottom: 16,
  },
  resultsList: {
    gap: 14,
    paddingBottom: 14,
  },
  resultCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 15,
    fontFamily: 'RobotoBold',
    color: '#0f172a',
  },
  resultDate: {
    fontSize: 13,
    fontFamily: 'Roboto',
    color: '#64748b',
  },
  resultDescription: {
    fontSize: 14,
    fontFamily: 'Roboto',
    color: '#475569',
    marginBottom: 10,
    lineHeight: 20,
  },
  resultScore: {
    fontSize: 14,
    fontFamily: 'RobotoBold',
    color: '#1e40af',
  },
  closeButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#ffffff',
    fontFamily: 'RobotoBold',
    fontSize: 16,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    margin: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'RobotoBold',
    color: '#0f172a',
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 15,
    fontFamily: 'Roboto',
    color: '#475569',
    lineHeight: 22,
    marginBottom: 20,
  },
});
