export const OFFICE_DEPARTMENT_OPTIONS = [
  'Scholarship',
  'Department of Finance',
  'Office of the Registrar',
  'Office of the Vice President',
  'Office of the President',
  'Guidance Office',
  'Property/Security Office',
  'Academic Council',
] as const

const OFFICE_SET = new Set<string>(OFFICE_DEPARTMENT_OPTIONS)

export function isOfficeDepartment(name: string): boolean {
  return OFFICE_SET.has(name)
}

export function removeOfficeDepartments<T extends { name: string }>(items: T[]): T[] {
  return items.filter((item) => !isOfficeDepartment(item.name))
}

export function buildAdminDepartmentOptions(
  baseDepartments: { name: string }[],
  includeOffice: boolean
): string[] {
  const cleanedBase = removeOfficeDepartments(baseDepartments).map((d) => d.name)
  if (!includeOffice) return cleanedBase
  return [...cleanedBase, ...OFFICE_DEPARTMENT_OPTIONS]
}

