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
    this._prepareGuardianData(actorData);
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

  _prepareGuardianData(actorData) {
    if (actorData.type !== "guardian") return;

    function sumStats(items, stats) {
      return items.reduce((acc, item) => {
        stats.forEach((stat) => {
          // 해당 속성이 존재하면 합산
          acc[stat] =
            (acc[stat] || 0) + (item.system["battle-stats"][stat] || 0);
        });
        return acc;
      }, {});
    }

    function sumDefense(items, defenses) {
      return items.reduce((acc, item) => {
        defenses.forEach((defense) => {
          // 해당 방어력이 존재하면 합산
          acc[defense] =
            (acc[defense] || 0) + (item.system["defense"][defense] || 0);
        });
        return acc;
      }, {});
    }

    // 합산할 속성 리스트 정의
    const battleStats = [
      "accuracy",
      "evasion",
      "artillery",
      "defense",
      "initiative",
      "field",
      "durability",
      "response",
      "damage",
      "speed",
    ]; // 예시 속성들

    const defenseStats = [
      "slash",
      "pierce",
      "blunt",
      "fire",
      "ice",
      "electric",
      "light",
      "dark",
    ]; // 예시 방어력들

    const system = actorData.system;
    const model = actorData.itemTypes["guardian-model"][0] || null;
    const pilot = system.pilot?.id
      ? game.actors.get(system.pilot.id)?.system
      : null;

    const weapons = actorData.itemTypes["guardian-weapon"].filter(
      (equip) => equip.system.equipped
    );
    const options = actorData.itemTypes["guardian-option"].filter(
      (equip) => equip.system.equipped
    );

    // weapons와 options의 속성 값을 각각 합산
    const totalWeaponStats = sumStats(weapons, battleStats);
    const totalOptionStats = sumStats(options, battleStats);
    const totalOptionDefenses = sumDefense(options, defenseStats);

    system.attributes.str.mod = pilot?.attributes.str.mod ?? 0;
    system.attributes.dex.mod = pilot?.attributes.dex.mod ?? 0;
    system.attributes.per.mod = pilot?.attributes.per.mod ?? 0;
    system.attributes.int.mod = pilot?.attributes.int.mod ?? 0;
    system.attributes.wil.mod = pilot?.attributes.wil.mod ?? 0;
    system.attributes.luk.mod = pilot?.attributes.luk.mod ?? 0;

    system["battle-stats"].accuracy.added =
      (pilot?.["battle-stats"].accuracy.total ?? 0) +
      (model?.system["battle-stats"].accuracy ?? 0) +
      (totalWeaponStats.accuracy ?? 0) +
      (totalOptionStats.accuracy ?? 0) +
      system["battle-stats"].accuracy.mod;

    system["battle-stats"].evasion.added =
      (pilot?.["battle-stats"].evasion.total ?? 0) +
      (model?.system["battle-stats"].evasion ?? 0) +
      (totalWeaponStats.evasion ?? 0) +
      (totalOptionStats.evasion ?? 0) +
      system["battle-stats"].evasion.mod;

    system["battle-stats"].artillery.added =
      (pilot?.["battle-stats"].artillery.total ?? 0) +
      (model?.system["battle-stats"].artillery ?? 0) +
      (totalWeaponStats.artillery ?? 0) +
      (totalOptionStats.artillery ?? 0) +
      system["battle-stats"].artillery.mod;

    system["battle-stats"].defense.added =
      (pilot?.["battle-stats"].defense.total ?? 0) +
      (model?.system["battle-stats"].defense ?? 0) +
      (totalWeaponStats.defense ?? 0) +
      (totalOptionStats.defense ?? 0) +
      system["battle-stats"].defense.mod;

    system["battle-stats"].initiative.added =
      (pilot?.["battle-stats"].initiative.total ?? 0) +
      (model?.system["battle-stats"].initiative ?? 0) +
      (totalWeaponStats.initiative ?? 0) +
      (totalOptionStats.initiative ?? 0) +
      system["battle-stats"].initiative.mod;

    system["battle-stats"].damage.added =
      (pilot?.["battle-stats"].damage.total ?? 0) +
      (model?.system["battle-stats"].damage ?? 0) +
      (totalOptionStats.damage ?? 0) +
      system["battle-stats"].damage.mod;

    system.defense.slash.total =
      (model?.system.defense.slash ?? 0) +
      (totalOptionDefenses.slash ?? 0) +
      system.defense.slash.mod;

    system.defense.pierce.total =
      (model?.system.defense.pierce ?? 0) +
      (totalOptionDefenses.pierce ?? 0) +
      system.defense.pierce.mod;

    system.defense.blunt.total =
      (model?.system.defense.blunt ?? 0) +
      (totalOptionDefenses.blunt ?? 0) +
      system.defense.blunt.mod;

    system.defense.fire.total =
      (model?.system.defense.fire ?? 0) +
      (totalOptionDefenses.fire ?? 0) +
      system.defense.fire.mod;

    system.defense.ice.total =
      (model?.system.defense.ice ?? 0) +
      (totalOptionDefenses.ice ?? 0) +
      system.defense.ice.mod;

    system.defense.electric.total =
      (model?.system.defense.electric ?? 0) +
      (totalOptionDefenses.electric ?? 0) +
      system.defense.electric.mod;

    system.defense.light.total =
      (model?.system.defense.light ?? 0) +
      (totalOptionDefenses.light ?? 0) +
      system.defense.light.mod;

    system.defense.dark.total =
      (model?.system.defense.dark ?? 0) +
      (totalOptionDefenses.dark ?? 0) +
      system.defense.dark.mod;

    system["battle-stats"].field.total =
      (pilot?.["battle-stats"].field.total ?? 0) +
      (model?.system["battle-stats"].field ?? 0) +
      (totalWeaponStats.field ?? 0) +
      (totalOptionStats.field ?? 0) +
      system["battle-stats"].field.mod;

    system["battle-stats"].durability.total =
      (pilot?.["battle-stats"].durability.total ?? 0) +
      (model?.system["battle-stats"].durability ?? 0) +
      (totalWeaponStats.durability ?? 0) +
      (totalOptionStats.durability ?? 0) +
      system["battle-stats"].durability.mod;

    system["battle-stats"].response.total =
      (pilot?.["battle-stats"].response.total ?? 0) +
      (model?.system["battle-stats"].response ?? 0) +
      (totalWeaponStats.response ?? 0) +
      (totalOptionStats.response ?? 0) +
      system["battle-stats"].response.mod;

    system["battle-stats"].damage.total =
      (pilot?.["battle-stats"].damage.total ?? 0) +
      (model?.system["battle-stats"].damage ?? 0) +
      (totalWeaponStats.damage ?? 0) +
      (totalOptionStats.damage ?? 0) +
      system["battle-stats"].damage.mod;

    system.FP.max = system["battle-stats"].field.total + system.FP.mod;
    system.HP.max = system["battle-stats"].durability.total + system.HP.mod;
    system.EN.max = system["battle-stats"].response.total + system.EN.mod;

    system.size = model?.system.size ?? "";

    system["battle-stats"].speed.value =
      Math.floor(system.attributes.str.mod / 3) +
      (model?.system["battle-stats"].speed ?? 0) +
      (totalWeaponStats.speed ?? 0) +
      (totalOptionStats.speed ?? 0) +
      system["battle-stats"].speed.mod;

    system["battle-stats"].speed.full = system["battle-stats"].speed.value * 2;
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

    const defenses = [
      "slash",
      "pierce",
      "blunt",
      "fire",
      "ice",
      "electric",
      "light",
      "dark",
    ]; // 예시 방어력들

    Object.keys(defenses).forEach((def) => {
      const armorBonus = armors.reduce(
        (acc, armor) => acc + (Number(armor.system.defense[def]) || 0),
        0
      );

      console.log(armorBonus);

      system.defense[def].total = armorBonus;
    });
  }
}
