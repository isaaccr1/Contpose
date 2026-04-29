import { ScrollView, Text, TouchableOpacity, View, StyleSheet, SafeAreaView } from 'react-native';
import { Link } from 'expo-router';

export default function Terms() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Términos y Condiciones</Text>
          <Text style={styles.updated}>Última actualización: 29 de abril de 2026</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Bienvenido a ContPose</Text>
          <Text style={styles.paragraph}>
            Al descargar, acceder o utilizar esta aplicación móvil, el usuario acepta cumplir con los presentes Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, deberá abstenerse de utilizar la aplicación.
          </Text>

          <Text style={styles.sectionTitle}>1. Descripción de la aplicación</Text>
          <Text style={styles.paragraph}>
            ContPose es una aplicación móvil de entrenamiento virtual que utiliza la cámara del dispositivo y tecnologías de inteligencia artificial para:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Detectar ejercicios físicos.</Text>
            <Text style={styles.listItem}>• Contabilizar repeticiones.</Text>
            <Text style={styles.listItem}>• Analizar y corregir la postura del usuario durante la ejecución de ejercicios.</Text>
            <Text style={styles.listItem}>• Mostrar resultados y estadísticas relacionadas con el entrenamiento.</Text>
          </View>
          <Text style={styles.paragraph}>
            La aplicación tiene fines informativos, educativos y de apoyo físico general.
          </Text>

          <Text style={styles.sectionTitle}>2. Requisitos de uso</Text>
          <Text style={styles.paragraph}>
            Para utilizar la aplicación, el usuario deberá:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Tener al menos 13 años de edad.</Text>
            <Text style={styles.listItem}>• Contar con un dispositivo compatible.</Text>
            <Text style={styles.listItem}>• Disponer de acceso a internet para ciertas funciones.</Text>
            <Text style={styles.listItem}>• Permitir el acceso a la cámara del dispositivo.</Text>
          </View>
          <Text style={styles.paragraph}>
            El usuario es responsable de proporcionar información verídica durante el registro y mantener la confidencialidad de su cuenta.
          </Text>

          <Text style={styles.sectionTitle}>3. Uso de cámara e inteligencia artificial</Text>
          <Text style={styles.paragraph}>
            La aplicación utiliza la cámara del dispositivo para analizar movimientos corporales y detectar ejercicios físicos mediante inteligencia artificial.
          </Text>
          <Text style={styles.paragraph}>
            El usuario acepta que:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• La cámara será utilizada únicamente mientras la función de entrenamiento esté activa.</Text>
            <Text style={styles.listItem}>• El análisis corporal realizado por la IA tiene fines orientativos y puede presentar errores o imprecisiones.</Text>
            <Text style={styles.listItem}>• La aplicación no sustituye la supervisión profesional de un entrenador, médico o especialista en salud.</Text>
          </View>
          <Text style={styles.paragraph}>
            ContPose no garantiza resultados físicos, deportivos o médicos específicos.
          </Text>

          <Text style={styles.sectionTitle}>4. Datos recopilados</Text>
          <Text style={styles.paragraph}>
            La aplicación puede recopilar y almacenar:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Nombre de usuario.</Text>
            <Text style={styles.listItem}>• Correo electrónico.</Text>
            <Text style={styles.listItem}>• Historial de entrenamientos.</Text>
            <Text style={styles.listItem}>• Cantidad de repeticiones.</Text>
            <Text style={styles.listItem}>• Métricas relacionadas con postura y rendimiento.</Text>
            <Text style={styles.listItem}>• Información técnica del dispositivo.</Text>
          </View>
          <Text style={styles.paragraph}>
            Los datos serán utilizados para mejorar la experiencia del usuario, optimizar el funcionamiento de la aplicación y ofrecer estadísticas personalizadas.
          </Text>

          <Text style={styles.sectionTitle}>5. Privacidad y protección de datos</Text>
          <Text style={styles.paragraph}>
            ContPose se compromete a proteger la información personal de los usuarios conforme a la legislación aplicable.
          </Text>
          <Text style={styles.paragraph}>
            La información recopilada:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• No será vendida a terceros.</Text>
            <Text style={styles.listItem}>• Será almacenada mediante servicios seguros en la nube.</Text>
            <Text style={styles.listItem}>• Podrá utilizarse de forma anónima para mejorar los modelos de inteligencia artificial.</Text>
          </View>
          <Text style={styles.paragraph}>
            El usuario podrá solicitar la eliminación de su cuenta y datos asociados.
          </Text>

          <Text style={styles.sectionTitle}>6. Responsabilidad del usuario</Text>
          <Text style={styles.paragraph}>
            El usuario acepta utilizar la aplicación bajo su propia responsabilidad.
          </Text>
          <Text style={styles.paragraph}>
            El usuario deberá:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Realizar ejercicios en un espacio seguro.</Text>
            <Text style={styles.listItem}>• Evitar el uso de la aplicación en situaciones peligrosas.</Text>
            <Text style={styles.listItem}>• Suspender el entrenamiento si experimenta dolor, mareo o molestias físicas.</Text>
          </View>
          <Text style={styles.paragraph}>
            ContPose no será responsable por lesiones, accidentes o daños derivados del uso incorrecto de la aplicación.
          </Text>

          <Text style={styles.sectionTitle}>7. Propiedad intelectual</Text>
          <Text style={styles.paragraph}>
            Todo el contenido de la aplicación, incluyendo:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• diseño,</Text>
            <Text style={styles.listItem}>• logotipos,</Text>
            <Text style={styles.listItem}>• código,</Text>
            <Text style={styles.listItem}>• modelos de inteligencia artificial,</Text>
            <Text style={styles.listItem}>• interfaz gráfica,</Text>
            <Text style={styles.listItem}>• textos y elementos visuales,</Text>
          </View>
          <Text style={styles.paragraph}>
            pertenece a ContPose o a sus respectivos titulares y se encuentra protegido por las leyes de propiedad intelectual.
          </Text>
          <Text style={styles.paragraph}>
            Queda prohibida la copia, modificación, distribución o ingeniería inversa sin autorización previa.
          </Text>

          <Text style={styles.sectionTitle}>8. Suspensión o cancelación de cuentas</Text>
          <Text style={styles.paragraph}>
            ContPose podrá suspender o eliminar cuentas que:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• incumplan estos términos,</Text>
            <Text style={styles.listItem}>• hagan uso indebido de la plataforma,</Text>
            <Text style={styles.listItem}>• intenten vulnerar la seguridad de la aplicación,</Text>
            <Text style={styles.listItem}>• utilicen la aplicación con fines fraudulentos o ilícitos.</Text>
          </View>

          <Text style={styles.sectionTitle}>9. Disponibilidad del servicio</Text>
          <Text style={styles.paragraph}>
            La aplicación podrá presentar interrupciones, actualizaciones o fallos técnicos ocasionales.
          </Text>
          <Text style={styles.paragraph}>
            ContPose no garantiza disponibilidad continua e ininterrumpida del servicio.
          </Text>

          <Text style={styles.sectionTitle}>10. Modificaciones</Text>
          <Text style={styles.paragraph}>
            ContPose podrá modificar estos Términos y Condiciones en cualquier momento. Las modificaciones entrarán en vigor una vez publicadas dentro de la aplicación o en los medios oficiales correspondientes.
          </Text>
          <Text style={styles.paragraph}>
            El uso continuado de la aplicación después de dichas modificaciones implicará la aceptación de los nuevos términos.
          </Text>

          <Text style={styles.sectionTitle}>11. Limitación de responsabilidad</Text>
          <Text style={styles.paragraph}>
            La aplicación se proporciona “tal cual” y “según disponibilidad”.
          </Text>
          <Text style={styles.paragraph}>
            ContPose no garantiza:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• precisión absoluta en la detección de ejercicios,</Text>
            <Text style={styles.listItem}>• exactitud total en el conteo de repeticiones,</Text>
            <Text style={styles.listItem}>• ausencia de errores técnicos,</Text>
            <Text style={styles.listItem}>• compatibilidad con todos los dispositivos.</Text>
          </View>
          <Text style={styles.paragraph}>
            El usuario acepta utilizar la aplicación bajo su propio criterio y responsabilidad.
          </Text>

          <Text style={styles.sectionTitle}>12. Contacto</Text>
          <Text style={styles.paragraph}>
            Para dudas, aclaraciones o solicitudes relacionadas con estos Términos y Condiciones, el usuario podrá contactar al equipo de desarrollo mediante los canales oficiales de soporte de la aplicación.
          </Text>
        </ScrollView>

        <Link href="/signup" style={styles.backButton} asChild>
          <TouchableOpacity style={styles.backButtonInner}>
            <Text style={styles.backButtonText}>Volver al registro</Text>
          </TouchableOpacity>
        </Link>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontFamily: 'RobotoBold',
    color: '#0f172a',
    marginBottom: 4,
  },
  updated: {
    fontSize: 14,
    fontFamily: 'Roboto',
    color: '#475569',
  },
  content: {
    gap: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'RobotoBold',
    color: '#0f172a',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    fontFamily: 'Roboto',
    color: '#475569',
    lineHeight: 22,
  },
  list: {
    marginBottom: 12,
    paddingLeft: 10,
  },
  listItem: {
    fontSize: 15,
    fontFamily: 'Roboto',
    color: '#475569',
    lineHeight: 22,
    marginBottom: 4,
  },
  backButton: {
    marginTop: 12,
    alignSelf: 'center',
  },
  backButtonInner: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 180,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontFamily: 'RobotoBold',
    fontSize: 15,
  },
});
