import { SITE_TYPES, REMEDIATION_ACTIONS } from '../../../config/constants';

/**
 * integrations/gemini/promptTemplates/siteTypeTaxonomy.ts
 *
 * The canonical site-type taxonomy passed into every vision analysis prompt.
 * Defined once here so the prompt and the DB schema always agree.
 */

export const SITE_TYPE_DESCRIPTIONS: Record<(typeof SITE_TYPES)[number], string> = {
  discarded_tire:            'Discarded tyres (whole or cut) collecting rainwater',
  plastic_container:         'Any plastic bottle, bucket, basin, cup, or container holding stagnant water',
  metal_container:           'Tins, cans, drums, or other metal containers holding stagnant water',
  water_storage_tank_barrel: 'Domestic water-storage tank, barrel, or cistern (uncovered or poorly covered)',
  flower_pot_or_saucer:      'Flower pots, plant saucers, vases, or decorative containers with standing water',
  roof_gutter:               'Blocked or overflowing gutters and downpipes retaining water',
  blocked_drain:             'Blocked open drain, canal, or channel with slow-moving or stagnant water',
  construction_site_water:   'Water accumulated in pits, trenches, or containers at construction sites',
  coconut_shell:             'Discarded coconut shells or husks collecting rainwater',
  tree_hole:                 'Natural tree holes or leaf axils retaining rainwater',
  ornamental_pond:           'Ornamental ponds, fountains, or water features without fish/circulation',
  ac_or_fridge_tray:         'Air-conditioner condensate trays or refrigerator defrost trays holding water',
  bird_bath:                 'Bird baths or pet water bowls with standing water',
  tarpaulin_sheeting:        'Tarpaulins, plastic sheeting, or covers pooling rainwater in folds',
  unused_well:               'Unused or abandoned wells holding stagnant water',
  refuse_or_food_container:  'Discarded food/refuse containers, wrappers, or garbage collecting water',
  other:                     'Any other water-retaining structure not listed above',
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
  no_action_needed:     'No action required — no breeding risk present',
  other:                'Other remediation action required',
};
