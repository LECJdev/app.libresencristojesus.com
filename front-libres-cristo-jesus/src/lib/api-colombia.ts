export interface ColombiaDepartment {
  id: number;
  name: string;
}

export interface ColombiaCity {
  id: number;
  name: string;
  departmentId: number;
}

const API_COLOMBIA_BASE_URL = 'https://api-colombia.com/api/v1';

async function fetchApiColombia<T>(path: string): Promise<T> {
  const response = await fetch(`${API_COLOMBIA_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`API Colombia request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export async function fetchColombiaDepartments(): Promise<ColombiaDepartment[]> {
  const departments = await fetchApiColombia<ColombiaDepartment[]>('/Department');
  return sortByName(departments);
}

export async function fetchColombiaCitiesByDepartment(
  departmentId: number,
): Promise<ColombiaCity[]> {
  const cities = await fetchApiColombia<ColombiaCity[]>(
    `/Department/${departmentId}/cities`,
  );

  return sortByName(cities);
}
