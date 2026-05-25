import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Link } from 'expo-router';
import { z } from 'zod';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Modal, ScrollView, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import { zodResolver } from '@hookform/resolvers/zod';

const signUpSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(50, 'La contraseña es demasiado larga'),
  weight: z.preprocess(
    (value) => Number(value),
    z.number().positive('Ingresa un peso válido').max(500, 'Peso demasiado alto'),
  ),
  height: z.preprocess(
    (value) => Number(value),
    z.number().positive('Ingresa una altura válida').max(300, 'Altura demasiado alta'),
  ),
  age: z.preprocess(
    (value) => Number(value),
    z.number().int('Ingresa una edad válida').positive('Ingresa una edad válida').min(13, 'Debes tener al menos 13 años').max(120, 'Edad demasiado alta'),
  ),
});

type SignUpForm = z.infer<typeof signUpSchema>;

export default function SignUp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'weight' | 'height' | 'age' | null>(null);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors }, setValue, watch } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema)
  });

  const weight = watch('weight');
  const height = watch('height');
  const age = watch('age');
  const weightOptions = Array.from({ length: 171 }, (_, i) => 30 + i);
  const heightOptions = Array.from({ length: 101 }, (_, i) => 120 + i);
  const ageOptions = Array.from({ length: 88 }, (_, i) => 13 + i);

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
      setProfileImageUri(result.assets[0].uri);
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
      setProfileImageUri(result.assets[0].uri);
    }
  };

  const handlePickProfileImage = () => {
    Alert.alert('Foto de perfil', 'Selecciona una opcion', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Camara', onPress: takePhoto },
      { text: 'Galeria', onPress: pickFromLibrary },
    ]);
  };

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

  const onSubmit = async (data: SignUpForm) => {

    try {
      setLoading(true);
      setError(null);
      
      const { error: signupError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            weight: data.weight,
            height: data.height,
            age: data.age,
          }
        }
      });

      if (signupError) {
        throw signupError;
      }

      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (loginError) {
        throw loginError;
      }

      if (profileImageUri && loginData.user) {
        const avatar = await uploadAvatar(loginData.user.id, profileImageUri);
        const { error: updateUserError } = await supabase.auth.updateUser({
          data: {
            ...loginData.user.user_metadata,
            avatar_url: avatar.avatarUrl,
            avatar_path: avatar.avatarPath,
          },
        });

        if (updateUserError) {
          throw updateUserError;
        }
      }


    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ha ocurrido un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Logo />
            <TouchableOpacity style={styles.avatarButton} onPress={handlePickProfileImage} activeOpacity={0.85}>
              {profileImageUri ? (
                <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={28} color="#64748b" />
                </View>
              )}
              <Text style={styles.avatarButtonText}>Agregar foto de perfil</Text>
            </TouchableOpacity>
            <Text style={styles.pageTitle}>Crear cuenta</Text>
            <Text style={styles.subtitle}>
              Registra tu usuario para comenzar con ContPose
            </Text>
          </View>

          <View style={styles.form}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nombre</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre completo"
                    placeholderTextColor="#999"
                    autoCapitalize="words"
                    onChangeText={onChange}
                    value={value}
                  />
                </View>
              </View>
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Correo electrónico</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Correo electronico"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onChangeText={onChange}
                    value={value}
                  />
                </View>
              </View>
            )}
          />

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Peso (kg)</Text>
            <TouchableOpacity
              style={[styles.inputWrapper, styles.pickerButton]}
              onPress={() => setPickerTarget('weight')}
              activeOpacity={0.8}
            >
              <Ionicons name="barbell-outline" size={20} color="#666" style={styles.inputIcon} />
              <Text style={[styles.pickerText, !weight && styles.placeholderText]}>
                {weight ? `${weight} kg` : 'Selecciona tu peso'}
              </Text>
            </TouchableOpacity>
            {errors.weight && <Text style={styles.errorText}>{errors.weight.message}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Altura (cm)</Text>
            <TouchableOpacity
              style={[styles.inputWrapper, styles.pickerButton]}
              onPress={() => setPickerTarget('height')}
              activeOpacity={0.8}
            >
              <Ionicons name="resize-outline" size={20} color="#666" style={styles.inputIcon} />
              <Text style={[styles.pickerText, !height && styles.placeholderText]}>
                {height ? `${height} cm` : 'Selecciona tu altura'}
              </Text>
            </TouchableOpacity>
            {errors.height && <Text style={styles.errorText}>{errors.height.message}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Edad</Text>
            <TouchableOpacity
              style={[styles.inputWrapper, styles.pickerButton]}
              onPress={() => setPickerTarget('age')}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={20} color="#666" style={styles.inputIcon} />
              <Text style={[styles.pickerText, !age && styles.placeholderText]}>
                {age ? `${age} años` : 'Selecciona tu edad'}
              </Text>
            </TouchableOpacity>
            {errors.age && <Text style={styles.errorText}>{errors.age.message}</Text>}
          </View>

          <Modal
            visible={pickerTarget !== null}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setPickerTarget(null)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.pickerModalContent}>
                <Text style={styles.modalTitle}>
                  {pickerTarget === 'weight'
                    ? 'Selecciona tu peso'
                    : pickerTarget === 'height'
                    ? 'Selecciona tu altura'
                    : 'Selecciona tu edad'}
                </Text>
                <ScrollView contentContainerStyle={styles.pickerScroll}>
                  {((pickerTarget === 'weight') ? weightOptions : (pickerTarget === 'height') ? heightOptions : ageOptions).map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.pickerItem}
                      onPress={() => {
                        if (pickerTarget === 'weight') {
                          setValue('weight', item);
                        } else if (pickerTarget === 'height') {
                          setValue('height', item);
                        } else {
                          setValue('age', item);
                        }
                        setPickerTarget(null);
                      }}
                    >
                      <Text style={styles.pickerItemText}>
                        {pickerTarget === 'weight'
                          ? `${item} kg`
                          : pickerTarget === 'height'
                          ? `${item} cm`
                          : `${item} años`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setPickerTarget(null)}>
                  <Text style={styles.modalCloseText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Contraseña</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    placeholderTextColor="#999"
                    secureTextEntry
                    onChangeText={onChange}
                    value={value}
                  />
                </View>
              </View>
            )}
          />

          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={[styles.checkbox, acceptedTerms && styles.checkboxSelected]}
              onPress={() => setAcceptedTerms((current) => !current)}
              activeOpacity={0.8}
            >
              {acceptedTerms && (
                <Ionicons name="checkmark" size={16} color="#2563eb" />
              )}
            </TouchableOpacity>
            <Text style={styles.termsText}>
              Al crear una cuenta, aceptas nuestros{' '}
            </Text>
            <TouchableOpacity onPress={() => setShowTermsModal(true)}>
              <Text style={styles.linkText}>Términos y Condiciones</Text>
            </TouchableOpacity>
          </View>

          {!acceptedTerms && (
            <Text style={styles.errorText}>
              Debes aceptar los Términos y Condiciones para crear la cuenta.
            </Text>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity 
            style={[styles.button, (loading || !acceptedTerms) && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading || !acceptedTerms}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes una cuenta?</Text>
            <Link href="/signin">
              <Text style={styles.linkButton}>Iniciar sesión</Text>
            </Link>
          </View>
        </View>
        <Modal
          visible={showTermsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowTermsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView contentContainerStyle={styles.modalScroll}>
                <Text style={styles.modalTitle}>Términos y Condiciones de ContPose</Text>
                <Text style={styles.modalSubtitle}>Última actualización: 29 de abril de 2026</Text>
                <Text style={styles.modalSectionTitle}>Bienvenido a ContPose</Text>
                <Text style={styles.modalParagraph}>
                  Al descargar, acceder o utilizar esta aplicación móvil, el usuario acepta cumplir con los presentes Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, deberá abstenerse de utilizar la aplicación.
                </Text>
                <Text style={styles.modalSectionTitle}>1. Descripción de la aplicación</Text>
                <Text style={styles.modalParagraph}>
                  ContPose es una aplicación móvil de entrenamiento virtual que utiliza la cámara del dispositivo y tecnologías de inteligencia artificial para:
                </Text>
                <Text style={styles.modalListItem}>• Detectar ejercicios físicos.</Text>
                <Text style={styles.modalListItem}>• Contabilizar repeticiones.</Text>
                <Text style={styles.modalListItem}>• Analizar y corregir la postura del usuario durante la ejecución de ejercicios.</Text>
                <Text style={styles.modalListItem}>• Mostrar resultados y estadísticas relacionadas con el entrenamiento.</Text>
                <Text style={styles.modalParagraph}>
                  La aplicación tiene fines informativos, educativos y de apoyo físico general.
                </Text>
                <Text style={styles.modalSectionTitle}>2. Requisitos de uso</Text>
                <Text style={styles.modalParagraph}>
                  Para utilizar la aplicación, el usuario deberá:
                </Text>
                <Text style={styles.modalListItem}>• Tener al menos 13 años de edad.</Text>
                <Text style={styles.modalListItem}>• Contar con un dispositivo compatible.</Text>
                <Text style={styles.modalListItem}>• Disponer de acceso a internet para ciertas funciones.</Text>
                <Text style={styles.modalListItem}>• Permitir el acceso a la cámara del dispositivo.</Text>
                <Text style={styles.modalParagraph}>
                  El usuario es responsable de proporcionar información verídica durante el registro y mantener la confidencialidad de su cuenta.
                </Text>
                <Text style={styles.modalSectionTitle}>3. Uso de cámara e inteligencia artificial</Text>
                <Text style={styles.modalParagraph}>
                  La aplicación utiliza la cámara del dispositivo para analizar movimientos corporales y detectar ejercicios físicos mediante inteligencia artificial.
                </Text>
                <Text style={styles.modalParagraph}>
                  El usuario acepta que:
                </Text>
                <Text style={styles.modalListItem}>• La cámara será utilizada únicamente mientras la función de entrenamiento esté activa.</Text>
                <Text style={styles.modalListItem}>• El análisis corporal realizado por la IA tiene fines orientativos y puede presentar errores o imprecisiones.</Text>
                <Text style={styles.modalListItem}>• La aplicación no sustituye la supervisión profesional de un entrenador, médico o especialista en salud.</Text>
                <Text style={styles.modalParagraph}>
                  ContPose no garantiza resultados físicos, deportivos o médicos específicos.
                </Text>
                <Text style={styles.modalSectionTitle}>4. Datos recopilados</Text>
                <Text style={styles.modalParagraph}>
                  La aplicación puede recopilar y almacenar:
                </Text>
                <Text style={styles.modalListItem}>• Nombre de usuario.</Text>
                <Text style={styles.modalListItem}>• Correo electrónico.</Text>
                <Text style={styles.modalListItem}>• Historial de entrenamientos.</Text>
                <Text style={styles.modalListItem}>• Cantidad de repeticiones.</Text>
                <Text style={styles.modalListItem}>• Métricas relacionadas con postura y rendimiento.</Text>
                <Text style={styles.modalListItem}>• Información técnica del dispositivo.</Text>
                <Text style={styles.modalParagraph}>
                  Los datos serán utilizados para mejorar la experiencia del usuario, optimizar el funcionamiento de la aplicación y ofrecer estadísticas personalizadas.
                </Text>
                <Text style={styles.modalSectionTitle}>5. Privacidad y protección de datos</Text>
                <Text style={styles.modalParagraph}>
                  ContPose se compromete a proteger la información personal de los usuarios conforme a la legislación aplicable.
                </Text>
                <Text style={styles.modalParagraph}>
                  La información recopilada:
                </Text>
                <Text style={styles.modalListItem}>• No será vendida a terceros.</Text>
                <Text style={styles.modalListItem}>• Será almacenada mediante servicios seguros en la nube.</Text>
                <Text style={styles.modalListItem}>• Podrá utilizarse de forma anónima para mejorar los modelos de inteligencia artificial.</Text>
                <Text style={styles.modalParagraph}>
                  El usuario podrá solicitar la eliminación de su cuenta y datos asociados.
                </Text>
                <Text style={styles.modalSectionTitle}>6. Responsabilidad del usuario</Text>
                <Text style={styles.modalParagraph}>
                  El usuario acepta utilizar la aplicación bajo su propia responsabilidad.
                </Text>
                <Text style={styles.modalParagraph}>
                  El usuario deberá:
                </Text>
                <Text style={styles.modalListItem}>• Realizar ejercicios en un espacio seguro.</Text>
                <Text style={styles.modalListItem}>• Evitar el uso de la aplicación en situaciones peligrosas.</Text>
                <Text style={styles.modalListItem}>• Suspender el entrenamiento si experimenta dolor, mareo o molestias físicas.</Text>
                <Text style={styles.modalParagraph}>
                  ContPose no será responsable por lesiones, accidentes o daños derivados del uso incorrecto de la aplicación.
                </Text>
                <Text style={styles.modalSectionTitle}>7. Propiedad intelectual</Text>
                <Text style={styles.modalParagraph}>
                  Todo el contenido de la aplicación, incluyendo:
                </Text>
                <Text style={styles.modalListItem}>• diseño,</Text>
                <Text style={styles.modalListItem}>• logotipos,</Text>
                <Text style={styles.modalListItem}>• código,</Text>
                <Text style={styles.modalListItem}>• modelos de inteligencia artificial,</Text>
                <Text style={styles.modalListItem}>• interfaz gráfica,</Text>
                <Text style={styles.modalListItem}>• textos y elementos visuales,</Text>
                <Text style={styles.modalParagraph}>
                  pertenece a ContPose o a sus respectivos titulares y se encuentra protegido por las leyes de propiedad intelectual.
                </Text>
                <Text style={styles.modalParagraph}>
                  Queda prohibida la copia, modificación, distribución o ingeniería inversa sin autorización previa.
                </Text>
                <Text style={styles.modalSectionTitle}>8. Suspensión o cancelación de cuentas</Text>
                <Text style={styles.modalParagraph}>
                  ContPose podrá suspender o eliminar cuentas que:
                </Text>
                <Text style={styles.modalListItem}>• incumplan estos términos,</Text>
                <Text style={styles.modalListItem}>• hagan uso indebido de la plataforma,</Text>
                <Text style={styles.modalListItem}>• intenten vulnerar la seguridad de la aplicación,</Text>
                <Text style={styles.modalListItem}>• utilicen la aplicación con fines fraudulentos o ilícitos.</Text>
                <Text style={styles.modalSectionTitle}>9. Disponibilidad del servicio</Text>
                <Text style={styles.modalParagraph}>
                  La aplicación podrá presentar interrupciones, actualizaciones o fallos técnicos ocasionales.
                </Text>
                <Text style={styles.modalParagraph}>
                  ContPose no garantiza disponibilidad continua e ininterrumpida del servicio.
                </Text>
                <Text style={styles.modalSectionTitle}>10. Modificaciones</Text>
                <Text style={styles.modalParagraph}>
                  ContPose podrá modificar estos Términos y Condiciones en cualquier momento. Las modificaciones entrarán en vigor una vez publicadas dentro de la aplicación o en los medios oficiales correspondientes.
                </Text>
                <Text style={styles.modalParagraph}>
                  El uso continuado de la aplicación después de dichas modificaciones implicará la aceptación de los nuevos términos.
                </Text>
                <Text style={styles.modalSectionTitle}>11. Limitación de responsabilidad</Text>
                <Text style={styles.modalParagraph}>
                  La aplicación se proporciona “tal como es” y “según disponibilidad”.
                </Text>
                <Text style={styles.modalParagraph}>
                  ContPose no garantiza:
                </Text>
                <Text style={styles.modalListItem}>• precisión absoluta en la detección de ejercicios,</Text>
                <Text style={styles.modalListItem}>• exactitud total en el conteo de repeticiones,</Text>
                <Text style={styles.modalListItem}>• ausencia de errores técnicos,</Text>
                <Text style={styles.modalListItem}>• compatibilidad con todos los dispositivos.</Text>
                <Text style={styles.modalParagraph}>
                  El usuario acepta utilizar la aplicación bajo su propio criterio y responsabilidad.
                </Text>
                <Text style={styles.modalSectionTitle}>12. Contacto</Text>
                <Text style={styles.modalParagraph}>
                  Para dudas, aclaraciones o solicitudes relacionadas con estos Términos y Condiciones, el usuario podrá contactar al equipo de desarrollo mediante los canales oficiales de soporte de la aplicación.
                </Text>
              </ScrollView>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowTermsModal(false)}>
                <Text style={styles.modalCloseText}>Cerrar</Text>
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
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 0,
    paddingBottom: 0,
  },
  pageTitle: {
    fontSize: 30,
    fontFamily: 'RobotoBold',
    color: '#0f172a',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Roboto',
    color: '#475569',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 22,
  },
  avatarButton: {
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 10,
    gap: 8,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  avatarButtonText: {
    fontSize: 13,
    color: '#2563eb',
    fontFamily: 'RobotoBold',
  },
  form: {
    width: '100%',
    gap: 14,
    backgroundColor: '#ffffff',
    borderRadius: 26,
    padding: 18,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 8,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Roboto',
    color: '#334155',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 52,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: 'Roboto',
    fontSize: 16,
    color: '#0f172a',
    textAlignVertical: 'center',
    paddingVertical: 0,
    lineHeight: 22,
  },
  pickerText: {
    flex: 1,
    fontFamily: 'Roboto',
    fontSize: 16,
    color: '#0f172a',
    textAlignVertical: 'center',
    paddingVertical: 0,
    lineHeight: 22,
  },
  pickerButton: {
    backgroundColor: '#f8fafc',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  checkboxSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#e0e7ff',
  },
  termsText: {
    flex: 1,
    fontFamily: 'Roboto',
    color: '#64748b',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    maxHeight: '90%',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    elevation: 12,
  },
  modalScroll: {
    gap: 12,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'RobotoBold',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: 'Roboto',
    color: '#64748b',
    marginBottom: 12,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontFamily: 'RobotoBold',
    color: '#0f172a',
    marginTop: 12,
  },
  modalParagraph: {
    fontSize: 14,
    fontFamily: 'Roboto',
    color: '#475569',
    lineHeight: 20,
  },
  modalListItem: {
    fontSize: 14,
    fontFamily: 'Roboto',
    color: '#475569',
    lineHeight: 20,
    marginBottom: 2,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  pickerModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    maxHeight: '80%',
    width: '100%',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    elevation: 12,
  },
  pickerScroll: {
    gap: 10,
    paddingVertical: 8,
  },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    marginBottom: 6,
  },
  pickerItemText: {
    fontSize: 16,
    fontFamily: 'Roboto',
    color: '#0f172a',
  },
  modalCloseButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  modalCloseText: {
    color: '#ffffff',
    fontFamily: 'RobotoBold',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontFamily: 'RobotoBold',
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  footerText: {
    fontFamily: 'Roboto',
    color: '#64748b',
    fontSize: 14,
  },
  linkButton: {
    color: '#2563eb',
    fontFamily: 'RobotoBold',
    fontSize: 14,
  },
  linkText: {
    color: '#2563eb',
    fontFamily: 'RobotoBold',
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
    fontFamily: 'Roboto',
  },
});
