/**
 * Sihirbazın son adımı: sınıfı oluşturur, öğrencileri toplu ekler, seçilen hazır formları
 * oluşturur. Her aşama bir kez yapılır; hata olursa ilerleme korunur ve "Tekrar dene"
 * kaldığı yerden devam eder (sınıf iki kez oluşturulmaz).
 */
import { createForm, getPreset, type FormInput, type PresetId } from '@/features/forms';
import { addStudents, type NewStudent } from '@/features/students';
import type { ClassRow } from '@/types/database';

import { createClass } from '../api';
import { toUserMessage } from '../errors';
import type { ValidClass } from '../model';

export type SetupStage = 'class' | 'students' | 'forms';

export interface SetupProgress {
  classRow: ClassRow | null;
  studentsSaved: boolean;
  /** Oluşturulan hazır formlar. */
  formsSaved: PresetId[];
}

export const emptyProgress: SetupProgress = { classRow: null, studentsSaved: false, formsSaved: [] };

export interface SetupInput {
  klass: ValidClass;
  students: readonly NewStudent[];
  presets: readonly PresetId[];
}

export type SetupOutcome =
  | { ok: true; progress: SetupProgress; classRow: ClassRow }
  | { ok: false; progress: SetupProgress; stage: SetupStage; message: string };

export interface SetupApi {
  createClass: (input: ValidClass) => Promise<ClassRow>;
  addStudents: (classId: string, students: readonly NewStudent[]) => Promise<unknown>;
  createForm: (classId: string, input: FormInput) => Promise<unknown>;
}

const defaultApi: SetupApi = { createClass, addStudents, createForm };

export function presetFormInput(id: PresetId): FormInput | null {
  const preset = getPreset(id);
  if (!preset) return null;
  return { title: preset.title, subject: null, description: null, options: preset.options.map((o) => ({ ...o })) };
}

export function setupMessage(stage: SetupStage, className: string, error: unknown): string {
  switch (stage) {
    case 'class':
      return toUserMessage(error, 'Sınıf oluşturulamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    case 'students':
      return toUserMessage(error, `${className} oluşturuldu ama öğrenciler eklenemedi. Tekrar deneyin.`);
    case 'forms':
      return toUserMessage(error, `${className} oluşturuldu ama formlar eklenemedi. Tekrar deneyin.`);
  }
}

export async function runClassSetup(
  input: SetupInput,
  start: SetupProgress = emptyProgress,
  api: SetupApi = defaultApi,
): Promise<SetupOutcome> {
  let progress: SetupProgress = { ...start, formsSaved: [...start.formsSaved] };
  const name = input.klass.name;

  let classRow = progress.classRow;
  if (!classRow) {
    try {
      classRow = await api.createClass(input.klass);
      progress = { ...progress, classRow };
    } catch (error) {
      return { ok: false, progress, stage: 'class', message: setupMessage('class', name, error) };
    }
  }

  if (!progress.studentsSaved) {
    try {
      if (input.students.length > 0) await api.addStudents(classRow.id, input.students);
      progress = { ...progress, studentsSaved: true };
    } catch (error) {
      return { ok: false, progress, stage: 'students', message: setupMessage('students', classRow.name, error) };
    }
  }

  // Sıra numarası her seferinde sonuncudan hesaplandığı için formlar tek tek oluşturulur.
  for (const id of input.presets) {
    if (progress.formsSaved.includes(id)) continue;
    const form = presetFormInput(id);
    if (!form) continue;
    try {
      await api.createForm(classRow.id, form);
      progress = { ...progress, formsSaved: [...progress.formsSaved, id] };
    } catch (error) {
      return { ok: false, progress, stage: 'forms', message: setupMessage('forms', classRow.name, error) };
    }
  }

  return { ok: true, progress, classRow };
}
