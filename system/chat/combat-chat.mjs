import { RollType, AOVCheck, CardType } from "../apps/checks.mjs"
import { OPCard } from "./opposed-chat.mjs"
import AOVDialog from "../setup/aov-dialog.mjs"
import { AOVactorDetails } from '../apps/actor-details.mjs'

export class COCard {

  static async COResolve(config) {
    let targetMsg = await game.messages.get(config.targetChatId)
    let chatCards = targetMsg.flags.aov.chatCard
    let cardType = targetMsg.flags.aov.cardType
    //If there is only one participant then check you want to proceed
    if (chatCards.length < 2) {
      const confirm = await AOVDialog.confirm({
        window: { title: game.i18n.localize('AOV.card.soloCombat') },
        content: game.i18n.localize('AOV.card.soloCombatHint')
      })
      if (!confirm) { return }
    }

    //Get adjustment if a target score is over 100
    let targetAdj = 0
    if (chatCards.length > 1) {
      for (let i of chatCards) {
        if (i.targetScore > targetAdj) {
          targetAdj = i.targetScore
        }
      }
      targetAdj = -Math.max(0, targetAdj - 100)
    }

    //Go through each roll, calc revised Targetscore and roll results
    let newchatCards = []
    let card = ""
    let successLevelLabel = ""
    let counter = -1
    for (let i of chatCards) {
      counter ++
      i.targetAdj = targetAdj
      let revisedtargetScore = i.targetScore + targetAdj

      let roll = new Roll(chatCards[0].rollFormula)
      await roll.evaluate()
      let rollResult = Number(roll.result)

      let diceRolled = ""
      for (let diceRoll = 0; diceRoll < roll.dice.length; diceRoll++) {
        for (let thisDice = 0; thisDice < roll.dice[diceRoll].values.length; thisDice++) {
          if (thisDice != 0 || diceRoll != 0) {
            diceRolled = diceRolled + ", "
          }
          diceRolled = diceRolled + roll.dice[diceRoll].values[thisDice]
        }
      }
      let resultLevel = await AOVCheck.successLevel({
        targetScore: revisedtargetScore,
        rollResult: rollResult,
        cardType,
      })

      i.rollResult = rollResult
      i.diceRolled = diceRolled
      i.rollVal = rollResult
      i.targetScore = revisedtargetScore
      i.rollFumble = false
      i.rollDamage = false
      if (resultLevel === 0) { i.rollFumble = true }
      i.resultLevel = resultLevel
      i.resultLabel = game.i18n.localize('AOV.resultLevel.' + i.resultLevel)
      await OPCard.showDiceRoll(i)

      i.targetId = ""
      i.targetType = ""
      //If there is more than 1 participant then set the other party as the target
      if (chatCards.length > 1) {
        if (counter === 0) {
          i.targetId = chatCards[1].particId
          i.targetType = chatCards[1].particType
        } else {
          i.targetId = chatCards[0].particId
          i.targetType = chatCards[0].particType
        }
      }
      newchatCards.push(i)
    }

    //Work out overall Success Level
    if (newchatCards.length > 1) {
      successLevelLabel = game.i18n.localize('AOV.COResult.' + newchatCards[1].rollType + "." + newchatCards[0].resultLevel + newchatCards[1].resultLevel)
    }
    let combatResult = await COCard.combatResult(newchatCards)
    newchatCards[0].successLevel = combatResult.damageLvl0
    newchatCards[0].rollDamage = combatResult.rollDamage0
    if (newchatCards.length > 1) {
      newchatCards[1].successLevel = combatResult.damageLvl1
      newchatCards[1].rollDamage = combatResult.rollDamage1
    }

    await targetMsg.update({
      'flags.aov.chatCard': newchatCards,
      'flags.aov.state': 'closed',
      'flags.aov.successLevelLabel': successLevelLabel,
      'flags.aov.successLevelLabelVisible': game.settings.get('aov','combatNarrative'),
    })
    const pushhtml = await AOVCheck.startChat(targetMsg.flags.aov)
    await targetMsg.update({ content: pushhtml })
    return
  }

  static async combatResult(chatCards) {
    let resultData = ""

    if (chatCards.length < 2) {
      if (chatCards[0].resultLevel < 2) {
        resultData =
        {
          damageLvl0: 1,
          damageLvl1: 1,
          rollDamage0: false,
          rollDamage1: false,
        }
      } else {
        resultData =
        {
          damageLvl0: chatCards[0].resultLevel,
          damageLvl1: 1,
          rollDamage0: true,
          rollDamage1: false,
        }
      }
      return resultData
    }

    let result = chatCards[1].rollType + chatCards[0].resultLevel + chatCards[1].resultLevel

    switch (result) {
      //Normal Damage for Attacker
      case "WP44":
      case "WP33":
      case "WP22":
      case "WP21":
      case "WP20":
      case "WP10":
      case "SK21":
      case "SK20":
      case "SK10":
        resultData =
        {
          damageLvl0: 2,
          damageLvl1: 1,
          rollDamage0: true,
          rollDamage1: false,
        }
        break;

      //Special Damage for Attacker
      case "WP43":
      case "WP42":
      case "WP32":
      case "WP31":
      case "WP30":
      case "SK43":
      case "SK32":
      case "SK31":
      case "SK30":
        resultData =
        {
          damageLvl0: 3,
          damageLvl1: 1,
          rollDamage0: true,
          rollDamage1: false,
        }
        break;

      //Critical Damage for Attacker
      case "WP41":
      case "WP40":
      case "SK42":
      case "SK41":
      case "SK40":
        resultData =
        {
          damageLvl0: 4,
          damageLvl1: 1,
          rollDamage0: true,
          rollDamage1: false,
        }
        break;

      //Normal Damage for Defender
      case "WP34":
      case "WP23":
      case "WP12":
      case "WP02":
        resultData =
        {
          damageLvl0: 1,
          damageLvl1: 2,
          rollDamage0: false,
          rollDamage1: true,
        }
        break;
      //Special Damage for Defender
      case "WP24":
      case "WP14":
      case "WP13":
      case "WP04":
      case "WP03":
        resultData =
        {
          damageLvl0: 1,
          damageLvl1: 3,
          rollDamage0: false,
          rollDamage1: true,
        }
        break;

      //No Damage from either party
      case "WP11":
      case "WP01":
      case "WP00":
      case "SK44":
      case "SK34":
      case "SK24":
      case "SK14":
      case "SK04":
      case "SK33":
      case "SK32":
      case "SK31":
      case "SK30":
      case "SK34":
      case "SK33":
      case "SK24":
      case "SK23":
      case "SK22":
      case "SK14":
      case "SK13":
      case "SK12":
      case "SK11":
      case "SK04":
      case "SK03":
      case "SK02":
      case "SK01":
      case "SK00":
      default:
        resultData =
        {
          damageLvl0: 1,
          damageLvl1: 1,
          rollDamage0: false,
          rollDamage1: false,
        }
        break;
    }
    return resultData
  }


  static async COFumble(config) {
    let targetMsg = await game.messages.get(config.targetChatId)
    let chatCards = targetMsg.flags.aov.chatCard
    let chatCard = chatCards[Number(config.dataset.card)]
    let newChatCards = []

    //Get Fumble Table and give message if one doesn't exist
    let table = (await game.aov.cid.fromCIDBest({ cid: 'rt..fumbles' }))[0]
    if (!table) {
      ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.noTable', { tableCID: 'rt..fumbles' }))
      return
    }



    //Make Fumble Roll and Display Results
    const fumbleResults = await COCard.tableDiceRoll(table)
    let chatMsgData = {
      result: fumbleResults.results[0].description,
      particName: chatCard.particName,
      particImg: chatCard.particImg,
      rollResult: fumbleResults.roll.total
    }
    let html = await foundry.applications.handlebars.renderTemplate("systems/aov/templates/chat/fumble.hbs", chatMsgData);
    let alias = game.i18n.localize("AOV.card.fumble");
    let chatData = {};
    chatData = {
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: html,
      speaker: {
        actor: chatCard.particId,
        alias: alias,
      },
    };

    let msg = await ChatMessage.create(chatData);

    if (game.user.isGM) {
      COCard.resolveFum(config)
    } else {
      const availableGM = game.users.find(d => d.active && d.isGM)?.id
      if (availableGM) {
        game.socket.emit('system.aov', {
          type: 'resolveFum',
          to: availableGM,
          value: { config }
        })
      } else {
        ui.notifications.warn(game.i18n.localize('AOV.noAvailableGM'))
      }
    }
    return msg._id;
  }


  static async CODamage(config) {
    let targetMsg = await game.messages.get(config.targetChatId)
    let chatCards = targetMsg.flags.aov.chatCard
    let chatCard = chatCards[Number(config.dataset.card)]
    let newChatCards = []
    let particActor = await AOVactorDetails._getParticipant(
      chatCard.particId,
      chatCard.particType,
    );

    //Trigger a damage roll
    AOVCheck._trigger({
      rollType: RollType.DAMAGE,
      cardType: CardType.UNOPPOSED,
      shiftKey: false,
      actor: particActor,
      token: particActor.token,
      characteristic: false,
      skillId: chatCard.skillId,
      targetId: chatCard.targetId,
      targetType: chatCard.targetType,
      successLevel: (chatCard.successLevel).toString(),
      origID: chatCard.origID
    })

    if (game.user.isGM) {
      COCard.resolveDam(config)
    } else {
      const availableGM = game.users.find(d => d.active && d.isGM)?.id
      if (availableGM) {
        game.socket.emit('system.aov', {
          type: 'resolveDam',
          to: availableGM,
          value: { config }
        })
      } else {
        ui.notifications.warn(game.i18n.localize('AOV.noAvailableGM'))
      }
    }
  }

  static async resolveDam(config) {
    let targetMsg = await game.messages.get(config.targetChatId)
    let chatCards = targetMsg.flags.aov.chatCard
    let newChatCards = []
    for (let i of chatCards) {
      i.rollDamage = false
      newChatCards.push(i)
    }
    await targetMsg.update({
      'flags.aov.chatCard': newChatCards
    })
    const pushhtml = await AOVCheck.startChat(targetMsg.flags.aov)
    await targetMsg.update({ content: pushhtml })
  }



  static async resolveFum(config) {
    let targetMsg = await game.messages.get(config.targetChatId)
    let chatCards = targetMsg.flags.aov.chatCard
    let newChatCards = []
    //Update existing Card to Close the Fumble Roll
    let count = 0
    for (let i of chatCards) {
      if (count === Number(config.dataset.card)) {
        i.rollFumble = false
      }
      newChatCards.push(i)
      count++
    }
    await targetMsg.update({
      'flags.aov.chatCard': newChatCards
    })
    const pushhtml = await AOVCheck.startChat(targetMsg.flags.aov)
    await targetMsg.update({ content: pushhtml })
  }


  static async COHitLoc(config) {
    let targetMsg = await game.messages.get(config.targetChatId)
    let chatCards = targetMsg.flags.aov.chatCard
    let chatCard = chatCards[0]
    let newChatCards = []
    let thisUser = game.users.get(chatCard.origID)
    let targetActor = await AOVactorDetails._getParticipant(
      chatCard.targetId,
      chatCard.targetType,
    );
    if (targetActor) {
      let locList = await targetActor.items.filter(itm=>itm.type==='hitloc')
      let roll = new Roll('1D20');
      await roll.evaluate();
      if (game.modules.get('dice-so-nice')?.active) {
        game.dice3d.showForRoll(roll, thisUser, true, null, false)
      }
      let locRR = roll.total;
      let locName = "";
      let targetLocID = "";
      for (let locItem of locList) {
        if (locRR >= locItem.system.lowRoll && locRR <= locItem.system.highRoll) {
          locName = locItem.name +" (" + locItem.system.lowRoll
          if (locItem.system.lowRoll != locItem.system.highRoll) {
            locName = locName + "-" + locItem.system.highRoll
          }
          locName = locName + ") " + game.i18n.localize('AOV.roll') +": " + locRR
          targetLocID = locItem._id
        }
      }
      chatCard.targetLoc = locName;
      chatCard.targetLocID = targetLocID;
      newChatCards.push(chatCard);

      let newState = 'closed';
      //Built in prep of "apply damage" rules
      //if (game.settings.get('aov','autoDmg')) {newState = "applyDmg"};
      await targetMsg.update({
        'flags.aov.chatCard': newChatCards,
        'flags.aov.state': newState
      });
      const pushhtml = await AOVCheck.startChat(targetMsg.flags.aov);
      await targetMsg.update({ content: pushhtml });
    }
  }

  //Placeholder  - not ready for use yet
  static async COApplyDmg(config) {
    let targetMsg = await game.messages.get(config.targetChatId);
    let chatCards = targetMsg.flags.aov.chatCard;
    let chatCard = chatCards[0];
    let newChatCards = [];
    let targetActor = await AOVactorDetails._getParticipant(
      chatCard.targetId,
      chatCard.targetType,
    );
    if (!targetActor) {
      ui.notifications.warn(game.i18n.localize('AOV.noTargetID'));
      return;
    }
    //Consider all options, hit loc, parrying weapon, parry level - may get complicated
  }


  //Make a table roll display if Dice so Nice active and return the roll
  static async tableDiceRoll(table) {
    const tableResults = await table.roll();
    if (game.modules.get('dice-so-nice')?.active) {
      game.dice3d.showForRoll(tableResults.roll, game.user, true, null, false)
    }
    return tableResults
  }
}
