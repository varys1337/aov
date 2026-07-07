import { AOVCheck } from '../apps/checks.mjs'

export class OPCard {
  //Resolve an opposed card - roll dice, update and close
  /**
   *
   * @param config
   */
  static async OPResolve (config) {
    let targetMsg = await game.messages.get(config.targetChatId)
    let chatCards = targetMsg.flags.aov.chatCard
    let cardType = targetMsg.flags.aov.cardType
    if (chatCards.length < 2) {
      ui.notifications.warn(game.i18n.localize('AOV.card.resolveMore'))
      return
    }

    //Get adjustment if a target score is over 100
    let targetAdj = 0
    for (let i of chatCards) {
      if (i.targetScore > targetAdj) {
        targetAdj = i.targetScore
      }
    }
    targetAdj = -Math.max(0, targetAdj-100)

    //Go through each roll, calc revised Targetscore and roll results
    let newchatCards = []
    let card=''
    for (let i of chatCards) {
      i.targetAdj = targetAdj
      let revisedtargetScore = i.targetScore + targetAdj

      let roll = new Roll(chatCards[0].rollFormula)
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
        critChance: i.critChance,
        fumbleChance: i.fumbleChance
      })

      i.rollResult = rollResult
      i.diceRolled = diceRolled
      i.rollVal = rollResult
      i.targetScore = revisedtargetScore
      i.resultLevel = resultLevel
      i.resultLabel = game.i18n.localize('AOV.resultLevel.' + i.resultLevel)
      if (resultLevel <2) {
        i.successLevel = 0  //Loser
      } else {
        i.successLevel = 2 //Winner
      }
      await OPCard.showDiceRoll(i)
      newchatCards.push(i)
    }

    //Calculate Success Level for both parties - we only need to do something where both are winners

    //If one result Level exceeds the other then mark the other as Loser
    if (newchatCards[0].resultLevel > newchatCards[1].resultLevel) {
      newchatCards[1].successLevel = 0
    } else if (newchatCards[0].resultLevel < newchatCards[1].resultLevel) {
      newchatCards[0].successLevel = 0
    } else {
      //If the levels match and both are criticals then its a draw
      if (newchatCards[0].resultLevel === 4) {
        newchatCards[0].successLevel = 1
        newchatCards[1].successLevel = 1
        //Otherwise the lower roll wins
      } else if (newchatCards[0].rollResult > newchatCards[1].rollResult) {
        newchatCards[0].successLevel = 0
      } else if (newchatCards[0].rollResult < newchatCards[1].rollResult) {
        newchatCards[1].successLevel = 0
      } else {
        //Otherwise the roll and result levels match and its a draw
        newchatCards[0].successLevel = 1
        newchatCards[1].successLevel = 1
      }
    }
    newchatCards[0].successLevelLabel = game.i18n.localize('AOV.successLevel.'+newchatCards[0].successLevel)
    newchatCards[1].successLevelLabel = game.i18n.localize('AOV.successLevel.'+newchatCards[1].successLevel)


    await targetMsg.update({
      'flags.aov.chatCard': newchatCards,
      'flags.aov.state': 'closed'
    })
    const pushhtml = await AOVCheck.startChat(targetMsg.flags.aov)
    await targetMsg.update({ content: pushhtml })
    return
  }



  /**
   *
   * @param chatCard
   */
  static async showDiceRoll (chatCard) {
    //If this is an Opposed or Combat roll then for the dice to roll if Dice so Nice used

    let thisUser = game.users.get(chatCard.origID)
    if (game.modules.get('dice-so-nice')?.active) {
      let tens = Math.floor(chatCard.rollResult / 10)
      let units = chatCard.rollResult - (10 * tens)
      if (chatCard.rollResult === 100) {
        tens = 0
        units = 0
      }
      const diceData = {
        throws: [{
          dice: [
            {
              resultLabel: chatCard.rollResult,
              result: tens,
              type: 'd100',
              options: {},
              vectors: []
            },
            {
              resultLabel: chatCard.rollResult,
              result: units,
              type: 'd10',
              options: {},
              vectors: []
            }
          ]
        }]
      }
      game.dice3d.show(diceData, thisUser, true, null, false)  //Dice Data,user,sync,whispher,blind
    } else {
      await game.audio.play('sounds/dice.wav')
    }
    return
  }

}
