import { SITE_TYPES, REMEDIATION_ACTIONS } from '../../../config/constants';

/**
 * integrations/gemini/promptTemplates/siteTypeTaxonomy.ts
 *
 * The canonical site-type taxonomy passed into every vision analysis prompt.
 * Defined once here so the prompt and the DB schema always agree.
 */

export const SITE_TYPE_DESCRIPTIONS: Record<(typeof SITE_TYPES)[number], string> = {
  plastic_container:    'Any plastic bottle, bucket, basin, cup, or container holding stagnant water',
  drain:                'Open drain, canal, gutter, or any channel with slow-moving or stagnant water',
  tyre:                 'Discarded tyres (whole or cut) collecting rainwater',
  construction_water:   'Water accumulated in pits, trenches, or containers at construction sites',
  flower_pot:           'Flower pots, plant saucers, vases, or decorative containers with standing water',
  roof_gutter:          'Blocked or overflowing gutters and downpipes retaining water',
  other:                'Any other water-retaining structure not listed above',
};

export const SITE_TYPE_LIST = SITE_TYPES.join(' | ');

export const REMEDIATION_DESCRIPTIONS: Record<(typeof REMEDIATION_ACTIONS)[number], string> = {
  drain_water:          'Empty or drain the standing water immediately',
  remove_container:     'Remove and dispose of the container',
  apply_larvicide:      'Treat the water body with approved larvicide (Temephos or Bti)',
  cover_container:      'Tightly cover the container to prevent mosquito access',
  clear_drain:          'Clear blockage and ensure drainage flow',
  spray_insecticide:    'Apply residual insecticide spray to surrounding area',
  public_notice:        'Issue public advisory for the area',
  other:                'Other remediation action required',
};
