import * as trapsQueries from '../../db/queries/traps.queries';

export async function listTraps(filters: { zone_id?: string; status?: string }) {
  return trapsQueries.listTraps(filters);
}

export async function getTrapById(id: string) {
  return trapsQueries.getTrapById(id);
}

export async function getTrapReadings(trapId: string, days?: number) {
  return trapsQueries.getTrapReadings(trapId, days);
}

export async function createTrap(input: trapsQueries.CreateTrapInput) {
  return trapsQueries.createTrap(input);
}

export async function addReading(input: trapsQueries.AddTrapReadingInput) {
  return trapsQueries.addTrapReading(input);
}
