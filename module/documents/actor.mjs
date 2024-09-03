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
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system || {}; // undefined 방지를 위해 기본값 설정
    const flags = actorData.flags.metallicguardian || {};

    // Make separate methods for each Actor type to keep things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  _prepareCharacterData(actorData) {
    if (actorData.type !== "linkage") return;

    const systemData = actorData.system || {}; // undefined 방지를 위해 기본값 설정

    if (!systemData.abilities) return; // abilities가 undefined인 경우를 처리

    for (let [key, ability] of Object.entries(systemData.abilities)) {
      if (ability.value !== undefined) {
        ability.mod = Math.floor((ability.value - 10) / 2);
      }
    }
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
}
