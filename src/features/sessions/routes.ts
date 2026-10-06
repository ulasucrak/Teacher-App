import { todayIso } from './date';

/** Doldurma ekranında "henüz kaydedilmemiş kayıt" anlamına gelen kimlik. */
export const NEW_SESSION_ID = 'new';

export const sessionsRoutes = {
  /** Formun geçmiş kayıtları. */
  history: (classId: string, formId: string) => `/class/${classId}/form/${formId}` as const,
  /** Var olan bir kaydı açar. */
  session: (classId: string, formId: string, sessionId: string) =>
    `/class/${classId}/form/${formId}/session/${sessionId}` as const,
  /**
   * Verilen günün (varsayılan bugün) kaydını açar: o gün için kayıt varsa onu yükler, yoksa
   * boş bir kayıtla açılır ve ilk "Kaydet"te oluşturulur (boş kayıt birikmez).
   */
  day: (classId: string, formId: string, date: string = todayIso()) =>
    `/class/${classId}/form/${formId}/session/${NEW_SESSION_ID}?date=${date}` as const,
};
