import { AOVCheck } from '../apps/checks.mjs'
import { OPCard } from './opposed-chat.mjs'

export class RECard {


  //Remove a roll from a resistance card
  /**
   *
   * @param config
   */
  static async RERemove (config) {
    let targetMsg = await game.messages.get(config.targetChatId)
    let rank = config.dataset.rank
    let newChatCards = targetMsg.flags.aov.chatCard
    newChatCards.splice(rank, 1)
    await targetMsg.update({ 'flags.aov.chatCard': newChatCards })
    return
  }

  //Close a resistance card
  /**
   *
   * @param config
   */
  static async REClose (config) {
    let targetMsg = await game.messages.get(config.targetChatId)
    await targetMsg.update({
      'flags.aov.state': 'closed',
      'flgs.aov.successLevel': -1,
      'flags.aov.chatCard': []
    })
    const pushhtml = await AOVCheck.startChat(targetMsg.flags.aov)
    await targetMsg.update({ content: pushhtml })
    return
  }

  //Add a new roll to a Resistance Card
  /**
   *
   * @param config
   * @param msgId
   */
  static async REAdd (config, msgId) {
    if (game.user.isGM) {
      let targetMsg = await game.messages.get(msgId)
      let maxPart = 2
      if (config.cardType === 'AU') {maxPart = 6}
      if ((targetMsg.flags.aov.chatCard).length >= maxPart) {
        ui.notifications.warn(game.i18n.localize('AOV.card.resolveMax'))
        return
      }

      let newChatCards = targetMsg.flags.aov.chatCard
      newChatCards.push(config.chatCard[0])
      await targetMsg.update({ 'flags.aov.chatCard': newChatCards })
      const pushhtml = await AOVCheck.startChat(targetMsg.flags.aov)
      await targetMsg.update({ content: pushhtml })
    } else {
      const availableGM = game.users.find(d => d.active && d.isGM)?.id
      if (availableGM) {
        game.socket.emit('system.aov', {
          type: 'REAdd',
          to: availableGM,
          value: { config, msgId }
        })
      } else {
        ui.notifications.warn(game.i18n.localize('AOV.noAvailableGM'))
      }
    }
  }

  //Resolve a resistance card - roll dice, update and close
  /**
   *
   * @param config
   */
  static async REResolve (config) {
    let targetMsg = await game.messages.get(config.targetChatId)
    let chatCards = targetMsg.flags.aov.chatCard
    let cardType = targetMsg.flags.aov.cardType
    if (chatCards.length < 2) {
      ui.notifications.warn(game.i18n.localize('AOV.card.resolveMore'))
      return
    }

    let roll = new Roll(chatCards[0].rollFormula)
    await roll.evaluate()
    let rollResult = Number(roll.result)
    let targetScore = chatCards[0].targetScore - chatCards[1].targetScore + 50
    targetScore = Math.min(Math.max(5, targetScore), 95)

    let diceRolled = ''
    for (let diceRoll = 0; diceRoll < roll.dice.length; diceRoll++) {
      for (let thisDice = 0; thisDice < roll.dice[diceRoll].values.length; thisDice++) {
        if (thisDice != 0 || diceRoll != 0) {
          diceRolled = diceRolled + ', '
        }
        diceRolled = diceRolled + roll.dice[diceRoll].values[thisDice]
      }
    }

    let newchatCards = []
    let resultLevel = await AOVCheck.successLevel({
      targetScore: targetScore,
      rollResult: rollResult,
      cardType,
      critChance: 5,
      fumbleChance: 5
    })

    for (let i of chatCards) {
      i.targetScore = targetScore
      i.rollResult = rollResult
      i.diceRolled = diceRolled
      i.rollVal = rollResult
      i.resultLevel = resultLevel
      i.resultLabel = game.i18n.localize('AOV.resultLevel.' + i.resultLevel)
      newchatCards.push(i)
    }
    await OPCard.showDiceRoll(newchatCards[0])

    await targetMsg.update({
      'flags.aov.chatCard': newchatCards,
      'flags.aov.state': 'closed',
      'flags.aov.rollResult': rollResult
    })

    const pushhtml = await AOVCheck.startChat(targetMsg.flags.aov)
    await targetMsg.update({ content: pushhtml })

    return
  }
}
