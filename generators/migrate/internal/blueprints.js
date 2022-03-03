import { requireNamespace } from '@yeoman/namespace';

/**
 * @private
 * Normalize blueprint name: prepend 'generator-jhipster-' if needed
 * @param {string} blueprint - name of the blueprint
 * @returns {string} the normalized blueprint name
 */
export function normalizeBlueprintName(blueprint) {
  try {
    const ns = requireNamespace(blueprint);
    if (ns.unscoped.startsWith('generator-jhipster-')) {
      return ns.toString();
    }

    return ns.with({ unscoped: `generator-jhipster-${ns.unscoped}` }).toString();
  } catch {}

  if (blueprint && blueprint.startsWith('@')) {
    return blueprint;
  }

  if (blueprint && !blueprint.startsWith('generator-jhipster')) {
    return `generator-jhipster-${blueprint}`;
  }

  return blueprint;
}

/**
 * @private
 * Normalize blueprint name if needed and also extracts version if defined. If no version is defined then `latest`
 * is used by default.
 * @param {string} blueprint - name of the blueprint and optionally a version, e.g kotlin[@0.8.1]
 * @returns {object} containing the name and version of the blueprint
 */
export function parseBlueprintInfo(blueprint) {
  let bpName = normalizeBlueprintName(blueprint);
  const idx = bpName.lastIndexOf('@');
  if (idx > 0) {
    // Not scope.
    const version = bpName.slice(idx + 1);
    bpName = bpName.slice(0, idx);
    return {
      name: bpName,
      version,
    };
  }

  return {
    name: bpName,
  };
}

/**
 * @private
 * Splits and normalizes a comma separated list of blueprint names with optional versions.
 * @param {string|any[]} [blueprints] - comma separated list of blueprint names, e.g kotlin,vuewjs@1.0.1. If an array then
 * no processing is performed and it is returned as is.
 * @returns {Array} an array that contains the info for each blueprint
 */
export function parseBluePrints(blueprints) {
  if (Array.isArray(blueprints)) {
    return blueprints;
  }

  if (typeof blueprints === 'string') {
    return blueprints
      .split(',')
      .filter(el => (el?.length ?? 0) > 0)
      .map(blueprint => parseBlueprintInfo(blueprint));
  }

  return [];
}
