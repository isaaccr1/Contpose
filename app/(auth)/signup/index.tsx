import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Link } from 'expo-router';
import { z } from 'zod';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
});

type SignUpForm = z.infer<typeof signUpSchema>;

export default function SignUp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema)
  });

  const onSubmit = async (data: SignUpForm) => {

    try {
      setLoading(true);
      setError(null);
      
      const { error: signupError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name
          }
        }
      });

      if (signupError) {
        throw signupError;
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (loginError) {
        throw loginError;
      }


    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ha ocurrido un error');
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
            <Text style={styles.termsText}>
                Al crear una cuenta, aceptas nuestros{' '}
                <Text style={styles.linkText}>Términos y Condiciones</Text>
            </Text>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
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
  termsText: {
    flex: 1,
    fontFamily: 'Roboto',
    color: '#64748b',
    lineHeight: 20,
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
