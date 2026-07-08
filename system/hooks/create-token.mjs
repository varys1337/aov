import AOVDialog from '../setup/aov-dialog.mjs'

export default async function (document, options, userId) {
  // Only token creator can roll
  if (game.user.id !== userId) return

  const actor = document.actor
  if (!actor) return

  // Set token icon correctly
  if (
    document.texture.src === 'icons/svg/mystery-man.svg' &&
    actor.img &&
    document.texture.src !== actor.img) {
    await document.update({ 'texture.src': actor.img })
  }

  // If there is something to roll ask if we should roll it
  if (actor.type === 'npc') {
    let dropM = game.settings.get('aov', 'tokenDropMode')
    let statV = game.settings.get('aov', 'tokenVariantStatMode')
    let skillV = game.settings.get('aov', 'tokenVariantSkillMode')

    let askStats = false
    let askStatVariant = false
    let askSkillVariant = false
    let askDialog = false

    if (dropM === 'ask' && actor.hasRollableCharacteristics) {
      askStats = true
      askDialog = true
    }
    if (statV === 'ask') {
      askStatVariant = true
      askDialog = true
    }

    if (skillV === 'ask') {
      askSkillVariant = true
      askDialog = true
    }

    if (askDialog) {
      let statCreateOptions = {
        'roll': game.i18n.localize('AOV.Settings.tokenDropModeRoll'),
        'average': game.i18n.localize('AOV.Settings.tokenDropModeAverage'),
        'ignore': game.i18n.localize('AOV.Settings.tokenDropModeIgnore')
      }
      let statVariantOptions = {
        'roll': game.i18n.localize('AOV.Settings.tokenDropModeRoll'),
        'ignore': game.i18n.localize('AOV.Settings.tokenDropModeIgnore')
      }


      const data = {
        askStats,
        askStatVariant,
        askSkillVariant,
        statCreateOptions,
        statVariantOptions
      }
      let choices = await createTokenDialog.tokenDialog(data)

      //If choices cancelled then assume any 'ask' become 'ignore'
      if (!choices) {
        if (askStats) {dropM = 'ignore'};
        if (askStatVariant) {statV = 'ignore'};
        if (askSkillVariant) {skillV = 'ignore'};
      } else {
        if (askStats) {dropM = choices.statCreate};
        if (askStatVariant) {statV = choices.statVariant};
        if (askSkillVariant) {skillV = choices.skillVariant};
      }
    }

    //Apply the Stat Creation Option
    let lockActor = false
    switch (dropM) {
      case 'roll':
        await actor.rollCharacteristicsValue()
        ui.notifications.info(game.i18n.format('AOV.TokenCreationRoll.Rolled', { name: actor.name }))
        lockActor = true
        break
      case 'average':
        await actor.averageCharacteristicsValue()
        ui.notifications.info(game.i18n.format('AOV.TokenCreationRoll.Averaged', { name: actor.name }))
        lockActor = true
        break
      case 'ignore':
        break
    }

    //Apply the Stat Variant Option
    switch (statV) {
      case 'roll':
        await actor.rollCharacteristicsVariant()
        ui.notifications.info(game.i18n.format('AOV.TokenCreationRoll.StatVariantRolled', { name: actor.name }))
        lockActor = true
        break
      case 'ignore':
        break
    }

    //Apply the Stat Variant Option
    switch (skillV) {
      case 'roll':
        await actor.rollSkillsVariant()
        ui.notifications.info(game.i18n.format('AOV.TokenCreationRoll.SkillVariantRolled', { name: actor.name }))
        lockActor = true
        break
      case 'ignore':
        break
    }

    if (lockActor && !actor.system.locked) {
      await actor.update({ 'system.locked': true })
    }


  }
}

export class createTokenDialog {
  /**
   *
   * @param data
   */
  static async tokenDialog (data) {
    const html = await foundry.applications.handlebars.renderTemplate('systems/aov/templates/dialog/npcTokenCreate.hbs', data)
    const choices = await AOVDialog.input(
      {
        window: { title: game.i18n.localize('AOV.TokenCreationRoll.Title') },
        content: html,
        ok: {}
      }
    )
    return choices
  }
}
