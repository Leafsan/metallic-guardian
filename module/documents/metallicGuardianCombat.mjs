export class MetallicGuardianCombat extends Combat {
  /**
   * @override
   * Roll initiative for one or multiple Combatants within the Combat entity
   * @param ids A Combatant id or Array of ids for which to roll
   * @returns A promise which resolves to the updated Combat entity once updates are complete.
   */
  async rollInitiative(
    ids,
    { formula = null, updateTurn = true, messageOptions = {} } = {}
  ) {
    // Structure input data
    ids = typeof ids === "string" ? [ids] : ids;
    const currentId = this.combatant?.id;
    let combatantUpdates = [];
    for (const id of ids) {
      // Get Combatant data
      const c = this.combatants.get(id, { strict: true });

      let Init;
      if (c.actor.type === "linkage" || c.actor.type === "guardian") {
        Init = c.actor.system["battle-stats"].initiative.total ?? 0;
      } else {
        Init = c.actor.system["battle-stats"].initiative ?? 0;
      }

      //Do not roll for defeated combatants
      if (c.defeated) continue;

      if (c.actor.type === "linkage" || c.actor.type === "guardian") {
        Init += 0.1;
      }

      // Draw initiative
      combatantUpdates.push({
        _id: c.id,
        initiative: Init,
      });
    }

    // Ensure the turn order remains with the same combatant
    if (updateTurn && currentId) {
      await this.update({
        turn: this.turns.findIndex((t) => t.id === currentId),
      });
    }

    // Update multiple combatants
    await this.updateEmbeddedDocuments("Combatant", combatantUpdates);

    // Return the updated Combat
    return this;
  }

  /**
   * @override
   * Begin the combat encounter, advancing to round 1 and turn 1
   * @returns {Promise<Combat>}
   */
  async startCombat() {
    let ids = [];

    this.combatants.forEach((combatant) => {
      ids.push(combatant.id);
    });

    this.rollInitiative(ids);

    super.startCombat();
  }

  /**
   * Display a dialog querying the GM whether they wish to end the combat encounter and empty the tracker
   * @returns {Promise<Combat>}
   */
  async endCombat() {
    this.delete();
  }

  /**
   * @override
   * Advance the combat to the next round
   * @returns {Promise<Combat>}
   */
  async nextRound() {
    let ids = [];

    this.combatants.forEach((combatant) => {
      ids.push(combatant.id);
    });

    this.rollInitiative(ids);

    super.nextRound();
  }

  /**
   * @override
   * Rewind the combat to the previous round
   * @returns {Promise<Combat>}
   */
  async previousRound() {
    let ids = [];

    this.combatants.forEach((combatant) => {
      ids.push(combatant.id);
    });

    this.rollInitiative(ids);

    super.previousRound();
  }
}
