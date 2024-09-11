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
    context.config = CONFIG.METALLIC_GUARDIAN;
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Log the config to ensure it's being passed correctly
    console.log(context.config); // 로그 확인

    context.items = this.actor.items.toObject(); // Fetch all actor's items

    // Prepare character data and items.
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

    // 아이템 내용을 표시하는 이벤트 리스너 연결
    html.on("click", ".view-item", this._onViewItem.bind(this));

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
    html.on("click", ".roll-damage", async (ev) => {
      const itemId = $(ev.currentTarget).data("item-id");
      const item = this.actor.items.get(itemId);

      // 대미지 굴림 대화문 렌더링
      const dialogTemplate =
        "systems/metallic-guardian/templates/dialogs/damageDialog.hbs";
      const dialogData = {
        itemName: item.name,
        mainDamage:
          `<${item.system.main.type}> + ${item.system.main.damage}` ||
          "주대미지 없음",
        subDamage:
          `<${item.system.sub.type}> + ${item.system.sub.damage}` ||
          "부대미지 없음",
      };

      const html = await renderTemplate(dialogTemplate, dialogData);

      // 대미지 굴림 대화문 생성
      new Dialog({
        title: `${item.name} 대미지 굴림`,
        content: html,
        buttons: {
          rollMain: {
            icon: '<i class="fas fa-dice-d20"></i>',
            label: "주대미지",
            callback: async () => {
              const damageRoll = new Roll(`2d6 + @base`, {
                base:
                  item.system.main.damage +
                  this.actor.system["battle-stats"].damage.added,
              });
              damageRoll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flavor: `${item.name} 주대미지 롤 속성: ${item.system.main.type}`,
              });
            },
          },
          rollSub: {
            icon: '<i class="fas fa-dice-d20"></i>',
            label: "부대미지",
            callback: async () => {
              const damageRoll = new Roll(`2d6 + @base`, {
                base:
                  item.system.sub.damage +
                  this.actor.system["battle-stats"].damage.added,
              });
              damageRoll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flavor: `${item.name} 부대미지 롤 속성: ${item.system.sub.type}`,
              });
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "취소",
          },
        },
        default: "rollMain",
      }).render(true);
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

  /**
   * 아이템의 내용을 채팅 창에 요약해서 표시하는 함수
   * @param {Event} event   클릭 이벤트
   */
  _onViewItem(event) {
    // 클릭된 아이템의 ID를 가져옴
    const itemId = $(event.currentTarget).data("item-id");

    // 액터의 아이템 목록에서 해당 아이템을 찾음
    const item = this.actor.items.get(itemId);

    if (!item) return;

    // 아이템 종류에 따라 메시지 분기 처리
    let messageContent = `<h2>${item.name}</h2>`;

    switch (item.type) {
      case "gear": // Gear 타입 아이템 처리
        messageContent += `
        <p><strong>타이밍:</strong> ${item.system.timing}</p>
        <p><strong>종류:</strong> ${item.system.type}</p>
        <p><strong>구입 난이도:</strong> ${item.system["buy-difficulty"]}</p>
        <p><strong>상비포인트:</strong> ${item.system.price}</p>
        <p><strong>효과:</strong> ${item.system.description}</p>
      `;
        break;

      case "human-weapon": // Human Weapon 타입 아이템 처리
        messageContent += `
        <p><strong>종류:</strong> ${item.system["weapon-type"]}</p>
        <p><strong>사정거리:</strong> ${item.system.range}</p>
        <p><strong>부위:</strong> ${item.system.part}</p>
        <p><strong>소모:</strong> ${item.system.cost}</p>
        <p><strong>주공격:</strong> ${item.system.main.type} - 피해량: ${item.system.main.damage}</p>
        <p><strong>부공격:</strong> ${item.system.sub.type} - 피해량: ${item.system.sub.damage}</p>
        <p><strong>구입 난이도:</strong> ${item.system["buy-difficulty"]}</p>
        <p><strong>상비포인트:</strong> ${item.system.price}</p>
        <p><strong>효과:</strong> ${item.system.description}</p>
      `;
        break;

      case "human-armor": // Human Armor 타입 아이템 처리
        messageContent += `
        <p><strong>참격 방어:</strong> ${item.system.defense.slash}</p>
        <p><strong>관통 방어:</strong> ${item.system.defense.pierce}</p>
        <p><strong>타격 방어:</strong> ${item.system.defense.blunt}</p>
        <p><strong>화염 방어:</strong> ${item.system.defense.fire}</p>
        <p><strong>얼음 방어:</strong> ${item.system.defense.ice}</p>
        <p><strong>번개 방어:</strong> ${item.system.defense.electric}</p>
        <p><strong>광휘 방어:</strong> ${item.system.defense.light}</p>
        <p><strong>어둠 방어:</strong> ${item.system.defense.dark}</p>
        <p><strong>구입 난이도:</strong> ${item.system["buy-difficulty"]}</p>
        <p><strong>상비포인트:</strong> ${item.system.price}</p>
        <p><strong>효과:</strong> ${item.system.description}</p>
      `;
        break;

      case "skill": // Skill 타입 아이템 처리
        messageContent += `
        <p><strong>레벨:</strong> ${item.system.level}</p>
        <p><strong>타이밍:</strong> ${item.system.timing}</p>
        <p><strong>사정거리:</strong> ${item.system.range}</p>
        <p><strong>종류:</strong> ${item.system.type}</p>
        <p><strong>대상:</strong> ${item.system.target}</p>
        <p><strong>코스트:</strong> ${item.system.cost}</p>
        <p><strong>효과:</strong> ${item.system.description}</p>
      `;
        break;

      case "guardian-weapon": // Guardian Weapon 타입 아이템 처리
        messageContent += `
        <p><strong>종류:</strong> ${item.system["weapon-type"]}</p>
        <p><strong>사정거리:</strong> ${item.system.range}</p>
        <p><strong>부위:</strong> ${item.system.part}</p>
        <p><strong>소모:</strong> ${item.system.cost}</p>
        <p><strong>주공격:</strong> ${item.system.main.type} - 피해량: ${item.system.main.damage}</p>
        <p><strong>부공격:</strong> ${item.system.sub.type} - 피해량: ${item.system.sub.damage}</p>
        <p><strong>구입 난이도:</strong> ${item.system["buy-difficulty"]}</p>
        <p><strong>상비포인트:</strong> ${item.system.price}</p>
        <p><strong>효과:</strong> ${item.system.description}</p>
      `;
        break;

      case "guardian-option": // Guardian Option 타입 아이템 처리
        messageContent += `
        <p><strong>역장:</strong> ${item.system["battle-stats"].field}</p>
        <p><strong>감응:</strong> ${item.system["battle-stats"].response}</p>
        <p><strong>공격력:</strong> ${item.system["battle-stats"].damage}</p>
        <p><strong>이동력:</strong> ${item.system["battle-stats"].speed}</p>
        <p><strong>참격 방어:</strong> ${item.system.defense.slash}</p>
        <p><strong>관통 방어:</strong> ${item.system.defense.pierce}</p>
        <p><strong>타격 방어:</strong> ${item.system.defense.blunt}</p>
        <p><strong>화염 방어:</strong> ${item.system.defense.fire}</p>
        <p><strong>얼음 방어:</strong> ${item.system.defense.ice}</p>
        <p><strong>번개 방어:</strong> ${item.system.defense.electric}</p>
        <p><strong>광휘 방어:</strong> ${item.system.defense.light}</p>
        <p><strong>어둠 방어:</strong> ${item.system.defense.dark}</p>
        <p><strong>구입 난이도:</strong> ${item.system["buy-difficulty"]}</p>
        <p><strong>상비포인트:</strong> ${item.system.price}</p>
        <p><strong>효과:</strong> ${item.system.description}</p>
      `;
        break;

      default: // 기본 메시지 처리
        messageContent += `<p><strong>효과:</strong> ${item.system.description}</p>`;
        break;
    }

    // 채팅 메시지 생성 및 표시
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: messageContent,
    });
  }
}
