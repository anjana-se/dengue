import * as casesQueries from '../../db/queries/cases.queries';

export async function listCases(filters: {
  zone_id?: string;
  severity?: string;
  page?: number;
  limit?: number;
}) {
  return casesQueries.listCases(filters);
}

export async function getCaseHeatmap() {
  return casesQueries.getCaseHeatmap();
}
