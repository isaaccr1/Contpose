import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Link } from 'expo-router';
import { z } from 'zod';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import { zodResolver } from '@hookform/resolvers/zod';

const signInSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(50, 'La contraseña es demasiado larga'),
});

type SignInForm = z.infer<typeof signInSchema>;
const LOGIN_TIMEOUT_MS = 12000;

export default function SignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapLoginError = (err: unknown) => {
    if (err instanceof Error) {
      if (err.message === 'LOGIN_TIMEOUT') {
        return 'La conexión tardó demasiado. Verifica tu internet e inténtalo de nuevo.';
      }

      if (err.message.toLowerCase().includes('network request failed')) {
        return 'No se pudo conectar al servidor. Revisa tu red o VPN e inténtalo nuevamente.';
      }

      return err.message;
    }

    return 'Ha ocurrido un error';
  };

  const { control, handleSubmit, formState: { errors } } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema)
  });

  const onSubmit = async (data: SignInForm) => {
    try {
      setLoading(true);
      setError(null);

      const loginPromise = supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          clearTimeout(timeoutId);
          reject(new Error('LOGIN_TIMEOUT'));
        }, LOGIN_TIMEOUT_MS);
      });

      const { error: loginError } = await Promise.race([loginPromise, timeoutPromise]);

      if (loginError) {
        throw loginError;
      }

    } catch (err) {
      setError(mapLoginError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Logo />
            <Text style={styles.pageTitle}>Inicio de sesión</Text>
            <Text style={styles.subtitle}>Accede a tu cuenta para comenzar</Text>
          </View>

          <View style={styles.form}>
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
                  {errors.email && (
                    <Text style={styles.errorMessage}>{errors.email.message}</Text>
                  )}
                </View>
              )}
            />

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
                  {errors.password && (
                    <Text style={styles.errorMessage}>{errors.password.message}</Text>
                  )}
                </View>
              )}
            />

            <View style={styles.forgotPassword}>
              <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>¿No tienes una cuenta?</Text>
              <Link href="/signup">
                <Text style={styles.linkButton}>Crear cuenta nueva</Text>
              </Link>
            </View>
          </View>
        </View>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 30,
    fontFamily: 'RobotoBold',
    color: '#0f172a',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Roboto',
    color: '#475569',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 22,
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
  },
  forgotPassword: {
    alignItems: 'flex-end',
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
    fontSize: 14,
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
    fontFamily: 'Roboto',
  },
  errorMessage: {
    color: '#dc2626',
    fontSize: 14,
    fontFamily: 'Roboto',
  },
});
