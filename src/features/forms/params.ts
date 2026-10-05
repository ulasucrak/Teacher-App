/** expo-router parametresi dizi olarak da gelebilir; ilk değeri alır. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export const formsRoutes = {
  list: (classId: string) => `/class/${classId}/forms` as const,
  create: (classId: string, preset?: string) =>
    preset ? (`/class/${classId}/form/new?preset=${preset}` as const) : (`/class/${classId}/form/new` as const),
  sessions: (classId: string, formId: string) => `/class/${classId}/form/${formId}` as const,
  edit: (classId: string, formId: string) => `/class/${classId}/form/${formId}/edit` as const,
};
