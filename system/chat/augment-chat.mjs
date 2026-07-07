import { AOVCheck } from '../apps/checks.mjs'
import { OPCard } from './opposed-chat.mjs'

export class AUCard {
  /**
   *
   * @param config
   */
  static async AUResolve (config) {
    let targetMsg = await game.messages.get(config.targetChatId)
    let chatCards = targetMsg.flags.aov.chatCard
    let cardType = targetMsg.flags.aov.cardType
    if (chatCards.length < 2) {
      ui.notifications.warn(game.i18n.localize('AOV.card.resolveMore'))
      return
    }

    let newchatCards = []
    let augAdj = 0
    for (let i = chatCards.length-1 ; i>=0; i--) {
      let cCard = chatCards[i]
      let roll = new Roll(cCard.rollFormula)
      let revisedtargetScore = cCard.targetScore
      if (i <= 0) {
        cCard.augAdj = augAdj
        revisedtargetScore = revisedtargetScore + augAdj
      }
      await roll.evaluate()
      let rollResult = Number(roll.result)

      let diceRolled = ''
      for (let diceRoll = 0; diceRoll < roll.dice.length; diceRoll++) {
        for (let thisDice = 0; thisDice < roll.dice[diceRoll].values.length; thisDice++) {
          if (thisDice != 0 || diceRoll != 0) {
            diceRolled = diceRolled + ', '
          }
          diceRolled = diceRolled + roll.dice[diceRoll].values[thisDice]
        }
      }

      let resultLevel = await AOVCheck.successLevel({
        targetScore: revisedtargetScore,
        rollResult: rollResult,
        cardType,
        critChance: cCard.critChance,
        fumbleChance: cCard.fumbleChance
      })

      cCard.rollResult = rollResult
      cCard.targetScore = revisedtargetScore
      cCard.diceRolled = diceRolled
      cCard.rollVal = rollResult
      cCard.resultLevel = resultLevel
      cCard.resultLabel = game.i18n.localize('AOV.resultLevel.' + cCard.resultLevel)
      if (i >= 1) {
        switch (resultLevel) {
          case 0:
            augAdj = -50
            break
          case 1:
            augAdj = -20
            break
          case 2:
            augAdj = 20
            break
          case 3:
            augAdj = 30
            break
          case 2:
            augAdj = 50
            break
        }
      }
      cCard.augAdj = augAdj
      await OPCard.showDiceRoll(cCard)
      newchatCards.unshift(cCard)
    }

    await targetMsg.update({
      'flags.aov.chatCard': newchatCards,
      'flags.aov.state': 'closed'
    })
    const pushhtml = await AOVCheck.startChat(targetMsg.flags.aov)
    await targetMsg.update({ content: pushhtml })
    return

  }
}
