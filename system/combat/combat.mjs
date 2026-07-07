export class AoVCombat extends Combat {


  /**
   *
   * @param ids
   * @param root0
   * @param root0.formula
   * @param root0.updateTurn
   * @param root0.messageOptions
   */
  async rollInitiative (ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
    await super.rollInitiative(ids, { formula, updateTurn, messageOptions })
    return this
  }

  /**
   *
   */
  async startCombat () {
    super.startCombat()
  }

  /**
   *
   */
  async nextRound () {
    //Reset Initiative on Intent Sub-Round
    if (this.round/2 === Math.ceil(this.round/2)) {
      await this.rollAll()
    }
    super.nextRound()

  }

  /*Override*/
  /**
   *
   */
  async rollAll () {
    const ids = this.combatants.reduce((ids, c) => {
      if ( c.isOwner) ids.push(c.id)
      return ids
    }, [])
    return this.rollInitiative(ids)
  }


  /*Override*/
  /**
   *
   * @param ids
   * @param root0
   * @param root0.formula
   * @param root0.updateTurn
   * @param root0.messageOptions
   */
  async rollInitiative (ids, { formula=null, updateTurn=false, messageOptions={} }={}) {
    // Structure input data
    ids = typeof ids === 'string' ? [ids] : ids
    const chatRollMode = game.settings.get('core', 'rollMode')

    // Iterate over Combatants, performing an initiative roll for each
    const updates = []
    const messages = []
    for ( const [i, id] of ids.entries() ) {

      // Get Combatant data (non-strictly)
      const combatant = this.combatants.get(id)
      if ( !combatant?.isOwner ) continue

      // Produce an initiative roll for the Combatant
      const roll = combatant.getInitiativeRoll(formula)
      await roll.evaluate()
      updates.push({ _id: id, initiative: roll.total })
    }

    if ( !updates.length ) return this

    // Update combatants and combat turn
    const updateOptions = { turnEvents: false }
    if ( !updateTurn ) updateOptions.combatTurn = this.turn
    await this.updateEmbeddedDocuments('Combatant', updates, updateOptions)

    return this
  }

}
