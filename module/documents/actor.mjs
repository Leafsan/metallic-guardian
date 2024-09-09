export class MetallicGuardianActor extends Actor {
  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // 필요한 경우 여기서 기본 데이터 초기화
  }

  /** @override */
  applyActiveEffects() {
    // The Active Effects do not have access to their parent at preparation time so we wait until this stage to determine whether they are suppressed or not.
    this.effects.forEach((e) => e.determineSuppression());
    return super.applyActiveEffects();
  }

  /** @override */
  prepareDerivedData() {
    const actorData = this;

    // Make separate methods for each Actor type to keep things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  _prepareCharacterData(actorData) {
    if (actorData.type !== "linkage") return;

    const system = actorData.system;
    const str = system.attributes.str.value;
    const dex = system.attributes.dex.value;
    const per = system.attributes.per.value;
    const int = system.attributes.int.value;
    const wil = system.attributes.wil.value;
    const luk = system.attributes.luk.value;

    if (system.attributes) {
      for (let [k] of Object.entries(system.attributes)) {
        system.attributes[k].mod = Math.floor(system.attributes[k].value / 3);
      }
    }

    system.level =
      (Number(system.class.first.level) || 0) +
      (Number(system.class.second.level) || 0) +
      (Number(system.class.third.level) || 0);

    this._computeBattleStats(actorData);
  }

  _prepareNpcData(actorData) {
    if (actorData.type !== "npc") return;

    const systemData = actorData.system || {}; // undefined 방지를 위해 기본값 설정

    // CR이 undefined일 경우를 처리
    if (systemData.cr !== undefined) {
      systemData.xp = systemData.cr * systemData.cr * 100;
    }
  }

  getRollData() {
    const data = { ...super.getRollData() };

    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  _getCharacterRollData(data) {
    if (this.type !== "linkage") return;

    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        if (v) {
          data[k] = foundry.utils.deepClone(v); // v가 undefined인 경우를 방지
        }
      }
    }

    if (data.attributes && data.attributes.level) {
      data.lvl = data.attributes.level.value ?? 0;
    }
  }

  _getNpcRollData(data) {
    if (this.type !== "npc") return;

    // Process additional NPC data here.
  }

  _computeBattleStats(actorData) {
    const system = actorData.system;
    const classes = system.class;
    const battleStats = system["battle-stats"];
    const attributes = system.attributes;
    const weapons = actorData.itemTypes["human-weapon"].filter(
      (equip) => equip.system.equipped
    );
    const armors = actorData.itemTypes["human-armor"].filter(
      (equip) => equip.system.equipped
    );

    const stats = {
      accuracy: { base: 0, total: 0, added: 0 },
      evasion: { base: 0, total: 0, added: 0 },
      artillery: { base: 0, total: 0, added: 0 },
      defense: { base: 0, total: 0, added: 0 },
      initiative: { base: 0, total: 0, added: 0 },
      field: { base: 0, total: 0, added: 0 },
      durability: { base: 0, total: 0, added: 0 },
      response: { base: 0, total: 0, added: 0 },
      damage: { base: 0, total: 0, added: 0 },
    };

    // Calculate base battle stats
    stats.accuracy.base = Math.floor(
      (attributes.dex.mod + attributes.per.mod) / 2
    );
    stats.evasion.base = Math.floor(
      (attributes.dex.mod + attributes.luk.mod) / 2
    );
    stats.artillery.base = Math.floor(
      (attributes.per.mod + attributes.int.mod) / 2
    );
    stats.defense.base = Math.floor(
      (attributes.int.mod + attributes.luk.mod) / 2
    );
    stats.initiative.base = attributes.dex.mod + attributes.int.mod;
    stats.field.base = 0;
    stats.durability.base = attributes.str.value;
    stats.response.base = attributes.wil.value;
    stats.damage.base = 0;

    // Helper function to calculate class contribution
    const addClassStats = (stat) =>
      (classes.first[stat] || 0) +
      (classes.second[stat] || 0) +
      (classes.third[stat] || 0);

    // Calculate total battle stats
    Object.keys(stats).forEach((stat) => {
      stats[stat].total = stats[stat].base + addClassStats(stat);
    });

    // Assign back to battleStats
    Object.keys(stats).forEach((stat) => {
      battleStats[stat].base = stats[stat].base;
      battleStats[stat].total = stats[stat].total + battleStats[stat].mod;
    });

    Object.keys(stats).forEach((stat) => {
      const weaponBonus = weapons.reduce(
        (acc, weapon) =>
          acc + (Number(weapon.system["battle-stats"][stat]) || 0),
        0
      );
      const armorBonus = armors.reduce(
        (acc, armor) => acc + (Number(armor.system["battle-stats"][stat]) || 0),
        0
      );

      // Calculate total added stat
      battleStats[stat].added =
        battleStats[stat].total + weaponBonus + armorBonus;

      // Calculate speed
      battleStats.speed.value = Math.floor(attributes.str.mod / 3);
      battleStats.speed.full = 1 + Math.floor(attributes.str.mod / 3);

      system.HP.max = battleStats.durability.added;
    });
  }
}
