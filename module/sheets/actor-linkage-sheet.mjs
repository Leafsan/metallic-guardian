import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from "../helpers/effects.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class MetallicGuardianLinkageSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["metallic-guardian", "sheet", "actor", "linkage"],
      template:
        "systems/metallic-guardian/templates/actor/actor-linkage-sheet.hbs",
      width: 700,
      height: 600,
      resizable: false,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "bios",
        },
      ],
    });
  }

  // /** @override */
  // get template() {
  //   return `systems/metallic-guardian/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  // }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = context.actor;

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    context.items = this.actor.items.toObject(); // Fetch all actor's items

    // Prepare character data and items.
    console.log("Preparing character data...");
    this._prepareItems(context);
    this._prepareCharacterData(context);

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    // Enrich textarea content
    context.enrichments = {
      biography: await TextEditor.enrichHTML(context.system.biography, {
        async: true,
      }),
    };

    console.log("Actor Data:", actorData);
    console.log("Context Data:", context);

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {}

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const skills = [];

    const itemsWeapon = [];
    const itemsArmor = [];
    const itemsGear = [];

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;

      if (i.type === "skill") {
        skills.push(i);
      } else if (i.type === "human-weapon") {
        itemsWeapon.push(i);
      } else if (i.type === "human-armor") {
        itemsArmor.push(i);
      } else if (i.type === "gear") {
        itemsGear.push(i);
      }
    }

    // Assign and return
    context.skills = skills;
    context.items = {
      weapons: itemsWeapon,
      armor: itemsArmor,
      gear: itemsGear,
    };
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.on("click", ".item-edit", (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Update Inventory Item
    html.on("change", ".toggle-equipped", (ev) => {
      const input = ev.currentTarget;
      const itemId = input.dataset.itemId;
      const item = this.actor.items.get(itemId);
      item.update({ "system.equipped": input.checked });
    });

    // Add Inventory Item
    html.on("click", ".item-create", this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.on("click", ".item-delete", (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.on("click", ".effect-control", (ev) => {
      const row = ev.currentTarget.closest("li");
      const document =
        row.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(row.dataset.parentId);
      onManageActiveEffect(ev, document);
    });

    // 대미지 굴림 버튼 클릭 이벤트
    html.on("click", ".roll-damage", (ev) => {
      const itemId = $(ev.currentTarget).data("item-id");
      const item = this.actor.items.get(itemId);

      // 무기의 대미지 굴림 수행
      if (item) {
        const damageRoll = new Roll(item.system.damage);
        damageRoll.roll().toMessage({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          flavor: `${item.name} 대미지 롤`,
        });
      }
    });

    // Rollable abilities.
    html.on("click", ".rollable", this._onRoll.bind(this));

    // New Initiative event listener
    html.on("click", ".rollInitiative", this._onInitiativeRoll.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find("li.item").each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }
  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const rollType = element.dataset.action;

    // Define base stats for roll based on rollType
    let baseStat = 0;
    if (rollType.includes("Roll")) {
      const ability = rollType.replace("Roll", ""); // 'strRoll' -> 'str'
      baseStat = this.actor.system.attributes[ability].mod;
    } else {
      baseStat = this.actor.system["battle-stats"][rollType].total;
    }

    // Prepare data for the dialog
    const dialogTemplate =
      "systems/metallic-guardian/templates/dialogs/rollDialog.hbs";
    const dialogData = { rollType };

    // Render dialog for modifier input
    const html = await renderTemplate(dialogTemplate, dialogData);
    let modifier = 0;

    // Create dialog
    new Dialog({
      title: `${rollType} 판정`,
      content: html,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: "Roll",
          callback: async (html) => {
            modifier = parseInt(html.find('input[name="modifier"]').val()) || 0;

            // Roll the dice (2d6 + base stat + modifier)
            const roll = new Roll(`2d6 + @base + @modifier`, {
              base: baseStat,
              modifier: modifier,
            });

            roll.toMessage({
              speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              flavor: `${rollType} 판정 결과`,
            });
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
        },
      },
      default: "roll",
    }).render(true);
  }

  /**
   * Handle Initiative Roll and register in Combat Tracker.
   * @private
   */
  async _onInitiativeRoll() {
    // Get the actor's initiative value
    const initiative = this.actor.system["battle-stats"].initiative.added;

    // Ensure the actor is part of the combat
    if (!game.combat) {
      ui.notifications.error("No active combat encounter found.");
      return;
    }

    const combatant = game.combat.getCombatantByActor(this.actor.id);

    if (!combatant) {
      ui.notifications.error(
        "This actor is not part of the current encounter."
      );
      return;
    }

    // Register the initiative value in the encounter
    await game.combat.setInitiative(combatant.id, initiative);
    ui.notifications.info(
      `${this.actor.name}'s initiative set to ${initiative}`
    );
  }
}
