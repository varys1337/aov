import AOVDialog from '../setup/aov-dialog.mjs'

export class AoVCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
  /**
   *
   * @param options
   */
  constructor (options = {}) {
    super(options)
  }

  static DEFAULT_OPTIONS = {
    classes: ['aov']
  }

  /** @override */
  static PARTS = {
    header: {
      template: 'systems/aov/templates/combat/header.hbs'
    },
    tracker: {
      template: 'systems/aov/templates/combat/tracker.hbs'
    },
    footer: {
      template: 'templates/sidebar/tabs/combat/footer.hbs'
    }
  }

  //Add custome round label with two phases
  /** @inheritDoc */
  async _preparePartContext (partId, context, options) {
    context = await super._preparePartContext(partId, context, options)
    switch ( partId ) {
      case 'footer': case 'header': await this._prepareCombatContext(context, options); break
      case 'tracker': await this._prepareTrackerContext(context, options); break
    }
    let round = Number(context?.combat?.round)
    let roundLabel = ''
    if (round > 0) {
      roundLabel = game.i18n.format('COMBAT.Round', { round: Math.ceil(round/2) })
      if (round/2 === Math.ceil(round/2)) {
        context.roundLabel = roundLabel + ' (' + game.i18n.localize('AOV.action') +')'
        context.initAdj = false
      } else {
        context.roundLabel = roundLabel + ' (' + game.i18n.localize('AOV.intent') +')'
        context.initAdj = true
      }
    }
    return context
  }

  //Activate event listeners using the prepared sheet HTML
  /**
   *
   * @param context
   * @param options
   */
  async _onRender (context, options) {
    await super._onRender(context, options)

    for (const button of this.element.querySelectorAll('.adjustInit')) {
      if (button.dataset.aovBound === 'true') continue
      button.dataset.aovBound = 'true'
      button.addEventListener('click', this.adjustInit.bind(this))
    }
  }

  /**
   *
   * @param event
   */
  async adjustInit (event) {
    const { combatantId } = event.target.closest('[data-combatant-id]')?.dataset ?? {}
    const combatant = this.viewed?.combatants.get(combatantId)
    if ( !combatant ) return
    let value = await AoVCombatTracker.adjDex(combatant.name, combatant.initiative)
    if (value) {
      if (game.user.isGM) {
        await AoVCombatTracker.updateInit( combatant.uuid, combatant.initiative-value)
      } else {
        const availableGM = game.users.find(d => d.active && d.isGM)?.id
        if (availableGM) {
          game.socket.emit('system.aov', {
            type: 'combatantInit',
            to: availableGM,
            value: { combatantUuid:combatant.uuid, initiative: combatant.initiative-value }
          })
        } else {
          ui.notifications.warn(game.i18n.localize('AOV.noAvailableGM'))
        }
      }
    }
  }


  /**
   *
   * @param combatantUuid
   * @param value
   */
  static async updateInit (combatantUuid, value) {
    if (game.user.isGM) {
      let combatant = await fromUuid(combatantUuid)
      await combatant.update({ 'initiative': value })
    }
  }


  //Get value input
  /**
   *
   * @param name
   * @param init
   */
  static async adjDex (name, init) {
    let cardLabel = game.i18n.localize('AOV.Combat.combatant') + ': ' + name + ' [' + init + ']'
    const data = {
      cardLabel
    }


    const html = await foundry.applications.handlebars.renderTemplate('systems/aov/templates/dialog/dexRanks.hbs', data)
    const dlg = await AOVDialog.input(
      {
        window: { title: game.i18n.localize('AOV.Combat.adjInit') },
        content: html,
        ok: {
          label: game.i18n.localize('AOV.confirm')
        }
      }
    )
    let value = 0
    if (dlg.adjOther) {
      value = dlg.adjOther
    } else {
      switch (dlg.action) {
        case 'draw':
        case 'sheath':
        case 'surprised':
          value = 5
          break
        case 'move':
          value = init
          break
      }
    }
    return value
  }

}
