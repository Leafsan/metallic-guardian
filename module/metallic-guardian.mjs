// Import document classes.
import { MetallicGuardianActor } from "./documents/actor.mjs";
import { MetallicGuardianItem } from "./documents/item.mjs";
import { MetallicGuardianCombat } from "./documents/metallicGuardianCombat.mjs";
import { MetallicGuardianActiveEffect } from "./documents/metallicGuardianActiveEffect.mjs";
// Import sheet classes.
import { MetallicGuardianActorSheet } from "./sheets/actor-sheet.mjs";
import { MetallicGuardianItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { METALLIC_GUARDIAN } from "./helpers/config.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once("init", function () {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.metallicguardian = {
    MetallicGuardianActor,
    MetallicGuardianItem,
    rollItemMacro,
  };

  // Add custom constants for configuration.
  CONFIG.METALLIC_GUARDIAN = METALLIC_GUARDIAN;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "0d6",
    decimals: 0,
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = MetallicGuardianActor;
  CONFIG.Item.documentClass = MetallicGuardianItem;
  CONFIG.Combat.documentClass = MetallicGuardianCombat;
  CONFIG.ActiveEffect.documentClass = MetallicGuardianActiveEffect;
  CONFIG.time.roundTime = 6;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("metallic-guardian", MetallicGuardianActorSheet, {
    types: ["linkage"],
    makeDefault: true,
    label: "METALLIC_GUARDIAN.SheetLabels.Linkage",
  });
  Actors.registerSheet("metallic-guardian", MetallicGuardianActorSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "METALLIC_GUARDIAN.SheetLabels.NPC",
  });
  Actors.registerSheet("metallic-guardian", MetallicGuardianActorSheet, {
    types: ["guardian"],
    makeDefault: true,
    label: "METALLIC_GUARDIAN.SheetLabels.Guardian",
  });
  Actors.registerSheet("metallic-guardian", MetallicGuardianActorSheet, {
    types: ["enemy"],
    makeDefault: true,
    label: "METALLIC_GUARDIAN.SheetLabels.Enemy",
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("metallic-guardian", MetallicGuardianItemSheet, {
    makeDefault: true,
  });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper("concat", function () {
  var outStr = "";
  for (var arg in arguments) {
    if (typeof arguments[arg] != "object") {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper("toLowerCase", function (str) {
  return str.toLowerCase();
});

Handlebars.registerHelper("toUpperCase", function (str) {
  return str.toUpperCase();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== "Item") return;
  if (!data.uuid.includes("Actor.") && !data.uuid.includes("Token.")) {
    return ui.notifications.warn(
      "You can only create macro buttons for owned Items"
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.metallicguardian.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "metallic-guardian.itemMacro": true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: "Item",
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}
