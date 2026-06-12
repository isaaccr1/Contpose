import { supabase } from './supabase';

export interface ErrorLogEntry {
  timestampFrame: number;
  issues: string[];
  angles: Record<string, number>;
}

export interface WorkoutSaveData {
  userId: string;
  exerciseName: string;
  totalReps: number;
  correctReps: number;
  duration: number;
  errorLogs: ErrorLogEntry[];
}

export interface WorkoutRecord {
  id: string;
  fecha: string;
  duracion: number;
  sets: Array<{
    repeticiones: number;
    errores_postura: number;
    tiempo: number;
    exercises: { nombre: string } | null;
  }>;
}

async function getExerciseId(exerciseName: string): Promise<number | null> {
  const { data } = await supabase
    .from('exercises')
    .select('id')
    .eq('nombre', exerciseName)
    .maybeSingle();
  return data?.id ?? null;
}

export async function saveWorkoutSession(data: WorkoutSaveData): Promise<string | null> {
  // Ensure the public.users row exists before inserting the workout.
  // workouts.user_id has a FK to public.users.id, not directly to auth.users.
  await supabase
    .from('users')
    .upsert({ id: data.userId, fecha_registro: new Date().toISOString() }, { onConflict: 'id', ignoreDuplicates: true });

  const { data: workout, error: wErr } = await supabase
    .from('workouts')
    .insert({
      user_id: data.userId,
      fecha: new Date().toISOString(),
      duracion: data.duration,
    })
    .select('id')
    .single();

  if (wErr || !workout) {
    console.warn('[workoutService] Error al guardar workout:', wErr?.message);
    return null;
  }

  const exerciseId = await getExerciseId(data.exerciseName);

  const { data: set, error: sErr } = await supabase
    .from('sets')
    .insert({
      workout_id: workout.id,
      exercise_id: exerciseId,
      repeticiones: data.correctReps,
      errores_postura: data.totalReps - data.correctReps,
      tiempo: data.duration,
    })
    .select('id')
    .single();

  if (sErr || !set) {
    console.warn('[workoutService] Error al guardar set:', sErr?.message);
    return workout.id;
  }

  if (data.errorLogs.length > 0) {
    const rows = data.errorLogs.map((log) => ({
      set_id: set.id,
      timestamp_frame: log.timestampFrame,
      postura_correcta: false,
      tipo_error: log.issues.join(', '),
      angulos: log.angles,
    }));
    const { error: lErr } = await supabase.from('posture_logs').insert(rows);
    if (lErr) console.warn('[workoutService] Error al guardar posture_logs:', lErr.message);
  }

  return workout.id;
}

export async function getWeeklyWorkouts(userId: string): Promise<WorkoutRecord[]> {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data, error } = await supabase
    .from('workouts')
    .select('id, fecha, duracion, sets(repeticiones, errores_postura, tiempo, exercises(nombre))')
    .eq('user_id', userId)
    .gte('fecha', since.toISOString())
    .order('fecha', { ascending: false });

  if (error) {
    console.warn('[workoutService] Error al obtener semanales:', error.message);
    return [];
  }
  return (data as unknown as WorkoutRecord[]) ?? [];
}

export async function getAllWorkouts(userId: string): Promise<WorkoutRecord[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, fecha, duracion, sets(repeticiones, errores_postura, tiempo, exercises(nombre))')
    .eq('user_id', userId)
    .order('fecha', { ascending: false });

  if (error) {
    console.warn('[workoutService] Error al obtener historial:', error.message);
    return [];
  }
  return (data as unknown as WorkoutRecord[]) ?? [];
}

export async function getRecentWorkouts(userId: string, days = 3): Promise<WorkoutRecord[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('workouts')
    .select('id, fecha, duracion, sets(repeticiones, errores_postura, tiempo, exercises(nombre))')
    .eq('user_id', userId)
    .gte('fecha', since.toISOString())
    .order('fecha', { ascending: false });

  if (error) {
    console.warn('[workoutService] Error al obtener recientes:', error.message);
    return [];
  }
  return (data as unknown as WorkoutRecord[]) ?? [];
}

export function calcWeeklyAccuracy(workouts: WorkoutRecord[]): number {
  let totalCorrect = 0;
  let totalAttempted = 0;
  for (const w of workouts) {
    for (const s of w.sets) {
      totalCorrect += s.repeticiones;
      totalAttempted += s.repeticiones + s.errores_postura;
    }
  }
  if (totalAttempted === 0) return 0;
  return Math.round((totalCorrect / totalAttempted) * 100);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatWorkoutDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
}
