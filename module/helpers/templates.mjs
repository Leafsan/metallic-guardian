/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return loadTemplates([
    // Actor partials.
    "systems/metallic-guardian/templates/actor/parts/actor-actions.hbs",
    "systems/metallic-guardian/templates/actor/parts/actor-bios.hbs",
    "systems/metallic-guardian/templates/actor/parts/actor-classes.hbs",
    "systems/metallic-guardian/templates/actor/parts/actor-items.hbs",
    "systems/metallic-guardian/templates/actor/parts/actor-effects.hbs",
    // Item partials
    "systems/metallic-guardian/templates/item/parts/item-effects.hbs",
  ]);
};
