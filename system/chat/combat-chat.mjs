import { RollType, AOVCheck, CardType } from '../apps/checks.mjs'
import { OPCard } from './opposed-chat.mjs'
import AOVDialog from '../setup/aov-dialog.mjs'
import { AOVactorDetails } from '../apps/actor-details.mjs'
import { AOVDamage } from '../apps/damage.mjs'

export class COCard {

  /**
   *
   * @param config
   */
  static async COResolve (config) {
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
    let card = ''
    let successLevelLabel = ''
    let counter = -1
    for (let i of chatCards) {
      counter ++
      i.targetAdj = targetAdj
      let revisedtargetScore = i.targetScore + targetAdj
      let rollResult = 100
      let diceRolled = ''
      let resultLevel = 1
      if (i.combatAction != 'none') {
        let roll = new Roll(chatCards[0].rollFormula)
        await roll.evaluate()
        rollResult = Number(roll.result)

        for (let diceRoll = 0; diceRoll < roll.dice.length; diceRoll++) {
          for (let thisDice = 0; thisDice < roll.dice[diceRoll].values.length; thisDice++) {
            if (thisDice != 0 || diceRoll != 0) {
              diceRolled = diceRolled + ', '
            }
            diceRolled = diceRolled + roll.dice[diceRoll].values[thisDice]
          }
        }
        resultLevel = await AOVCheck.successLevel({
          targetScore: revisedtargetScore,
          rollResult: rollResult,
          cardType,
          critChance: i.critChance,
          fumbleChance: i.fumbleChance

        })
      }

      i.rollResult = rollResult
      i.diceRolled = diceRolled
      i.rollVal = rollResult
      i.targetScore = revisedtargetScore
      i.rollFumble = false
      i.rollDamage = false
      i.wpnBlock = false
      i.wpnDam = 1
      i.armourBlock = false
      i.damageCF = false

      if (resultLevel === 0) { i.rollFumble = true }
      i.resultLevel = resultLevel
      i.resultLabel = game.i18n.localize('AOV.resultLevel.' + i.resultLevel)
      await OPCard.showDiceRoll(i)
      i.targetId = ''
      i.targetType = ''
      //If there is more than 1 participant then set the other party as the target
      if (chatCards.length > 1) {
        if (counter === 0) {
          i.targetId = chatCards[1].particId
          i.targetType = chatCards[1].particType
          i.targetWpnId = chatCards[1].skillId
        } else {
          i.targetId = chatCards[0].particId
          i.targetType = chatCards[0].particType
          i.targetWpnId = chatCards[0].skillId
        }
      }
      newchatCards.push(i)
    }


    //Work out overall Success Level
    if (newchatCards.length > 1) {
      successLevelLabel = game.i18n.localize('AOV.COResult.' + newchatCards[1].rollType + '.' + newchatCards[0].resultLevel + newchatCards[1].resultLevel)
    }
    let combatResult = await COCard.combatResult(newchatCards)
    newchatCards[0].successLevel = combatResult.damageLvl0
    newchatCards[0].rollDamage = combatResult.rollDamage0
    newchatCards[0].wpnBlock = combatResult.wpnBlock0
    newchatCards[0].wpnDam = combatResult.wpnDam0
    newchatCards[0].armourBlock = combatResult.armourBlock0
    newchatCards[0].damageCF = combatResult.damageCF0
    if (newchatCards.length > 1) {
      newchatCards[1].successLevel = combatResult.damageLvl1
      newchatCards[1].rollDamage = combatResult.rollDamage1
      newchatCards[1].wpnBlock = combatResult.wpnBlock1
      newchatCards[1].wpnDam = combatResult.wpnDam1
      newchatCards[1].armourBlock = combatResult.armourBlock1
      newchatCards[1].damageCF = combatResult.damageCF1
    }
    await targetMsg.update({
      'flags.aov.chatCard': newchatCards,
      'flags.aov.state': 'closed',
      'flags.aov.successLevelLabel': successLevelLabel,
      'flags.aov.successLevelLabelVisible': game.settings.get('aov', 'combatNarrative')
    })
    const pushhtml = await AOVCheck.startChat(targetMsg.flags.aov)
    await targetMsg.update({ content: pushhtml })
    return
  }

  // rollDamage = make damage roll true/false
  // damageLvl 4 = critical, 3 = special, 2 = normal 1 = none
  // wpnBlock = target's weapon blocks some damage true/false
  // wpnDam 0 = target weapon takes no damage, 1 = 1HP if dam done > HP, 2 = Damage Done -weaponHP, 3 = Damage Done
  // arnourBlock = target's armour absorps damage true/false
  // damageCF = excess damage after weapon is sent on to hit location
  /**
   *
   * @param chatCards
   */
  static async combatResult (chatCards) {
    let resultData = ''
    if (chatCards.length < 2) {
      if (chatCards[0].resultLevel < 2) {
        resultData =
          {
            rollDamage0: false,
            damageLvl0: 1,
            wpnBlock0: false,
            wpnDam0: 0,
            armourBlock0: false,
            damageCF0: false,
            rollDamage1: false,
            damageLvl1: 1,
            wpnBlock1: false,
            wpnDam1: 0,
            armourBlock1: false,
            damageCF1: false

          }
      } else {
        resultData =
          {
            rollDamage0: true,
            damageLvl0: chatCards[0].resultLevel,
            wpnBlock0: false,
            wpnDam0: 0,
            armourBlock0: false,
            damageCF0: false,
            rollDamage1: false,
            damageLvl1: 1,
            wpnBlock1: false,
            wpnDam1: 0,
            armourBlock1: false,
            damageCF1: false
          }
      }
      return resultData
    }

    let result = chatCards[1].rollType + chatCards[0].resultLevel + chatCards[1].resultLevel

    switch (result) {
      case 'WP41':
      case 'WP40':
      case 'SK42':
      case 'SK41':
      case 'SK40':
        resultData =
          {
            rollDamage0: true,
            damageLvl0: 4,
            wpnBlock0: false,
            wpnDam0: 0,
            armourBlock0: false,
            damageCF0: true,
            rollDamage1: false,
            damageLvl1: 1,
            wpnBlock1: false,
            wpnDam1: 0,
            armourBlock1: true,
            damageCF1: false
          }
        break
      case 'WP42':
        resultData =
          {
            rollDamage0: true,
            damageLvl0: 3,
            wpnBlock0: true,
            wpnDam0: 3,
            armourBlock0: false,
            damageCF0: true,
            rollDamage1: false,
            damageLvl1: 1,
            wpnBlock1: false,
            wpnDam1: 0,
            armourBlock1: true,
            damageCF1: false
          }
        break
      case 'WP32':
        resultData =
          {
            rollDamage0: true,
            damageLvl0: 3,
            wpnBlock0: true,
            wpnDam0: 2,
            armourBlock0: true,
            damageCF0: true,
            rollDamage1: false,
            damageLvl1: 1,
            wpnBlock1: false,
            wpnDam1: 0,
            armourBlock1: true,
            damageCF1: false
          }
        break
      case 'WP43':
        resultData =
          {
            rollDamage0: true,
            damageLvl0: 3,
            wpnBlock0: true,
            wpnDam0: 1,
            armourBlock0: false,
            damageCF0: true,
            rollDamage1: false,
            damageLvl1: 1,
            wpnBlock1: false,
            wpnDam1: 0,
            armourBlock1: true,
            damageCF1: false
          }
        break
      case 'WP31':
      case 'SK43':
      case 'SK32':
      case 'SK31':
      case 'SK30':
        resultData =
          {
            rollDamage0: true,
            damageLvl0: 3,
            wpnBlock0: false,
            wpnDam0: 0,
            armourBlock0: true,
            damageCF0: true,
            rollDamage1: false,
            damageLvl1: 1,
            wpnBlock1: false,
            wpnDam1: 0,
            armourBlock1: true,
            damageCF1: false
          }
        break
      case 'WP30':
        resultData =
          {
            rollDamage0: true,
            damageLvl0: 3,
            wpnBlock0: false,
            wpnDam0: 0,
            armourBlock0: false,
            damageCF0: true,
            rollDamage1: false,
            damageLvl1: 1,
            wpnBlock1: false,
            wpnDam1: 0,
            armourBlock1: true,
            damageCF1: false
          }
        break
      case 'WP44':
      case 'WP33':
      case 'WP22':
        resultData =
          {
            rollDamage0: true,
            damageLvl0: 2,
            wpnBlock0: true,
            wpnDam0: 1,
            armourBlock0: true,
            damageCF0: true,
            rollDamage1: false,
            damageLvl1: 1,
            wpnBlock1: false,
            wpnDam1: 0,
            armourBlock1: true,
            damageCF1: false
          }
        break
      case 'WP21':
      case 'WP20':
      case 'WP10':
      case 'SK21':
      case 'SK20':
      case 'SK10':
        resultData =
          {
            rollDamage0: true,
            damageLvl0: 2,
            wpnBlock0: false,
            wpnDam0: 0,
            armourBlock0: true,
            damageCF0: true,
            rollDamage1: false,
            damageLvl1: 1,
            wpnBlock1: false,
            wpnDam1: 0,
            armourBlock1: true,
            damageCF1: false
          }
        break
      case 'WP04':
      case 'WP14':
        resultData =
          {
            rollDamage0: false,
            damageLvl0: 1,
            wpnBlock0: false,
            wpnDam0: 0,
            armourBlock0: true,
            damageCF0: false,
            rollDamage1: true,
            damageLvl1: 3,
            wpnBlock1: true,
            wpnDam1: 3,
            armourBlock1: true,
            damageCF1: false
          }
        break
      case 'WP03':
      case 'WP13':
      case 'WP24':
        resultData =
          {
            rollDamage0: false,
            damageLvl0: 1,
            wpnBlock0: false,
            wpnDam0: 0,
            armourBlock0: true,
            damageCF0: false,
            rollDamage1: true,
            damageLvl1: 3,
            wpnBlock1: true,
            wpnDam1: 2,
            armourBlock1: true,
            damageCF1: false
          }
        break
      case 'WP02':
      case 'WP23':
      case 'WP34':
      case 'WP12':
        resultData =
          {
            rollDamage0: false,
            damageLvl0: 1,
            wpnBlock0: false,
            wpnDam0: 0,
            armourBlock0: true,
            damageCF0: false,
            rollDamage1: true,
            damageLvl1: 2,
            wpnBlock1: true,
            wpnDam1: 1,
            armourBlock1: true,
            damageCF1: false
          }
        break
      case 'WP01':
      case 'WP00':
      case 'WP11':
      case 'SK44':
      case 'SK34':
      case 'SK33':
      case 'SK24':
      case 'SK23':
      case 'SK22':
      case 'SK14':
      case 'SK13':
      case 'SK12':
      case 'SK11':
      case 'SK04':
      case 'SK03':
      case 'SK02':
      case 'SK01':
      case 'SK00':
        resultData =
          {
            rollDamage0: false,
            damageLvl0: 1,
            wpnBlock0: false,
            wpnDam0: 0,
            armourBlock0: true,
            damageCF0: false,
            rollDamage1: false,
            damageLvl1: 1,
            wpnBlock1: false,
            wpnDam1: 0,
            armourBlock1: true,
            damageCF1: false
          }
        break
    }
    return resultData
  }


  /**
   *
   * @param config
   */
  static async COFumble (config) {
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
    let html = await foundry.applications.handlebars.renderTemplate('systems/aov/templates/chat/fumble.hbs', chatMsgData)
    let alias = game.i18n.localize('AOV.card.fumble')
    let chatData = {}
    chatData = {
      user: game.user.id,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: html,
      speaker: {
        actor: chatCard.particId,
        alias: alias
      }
    }

    let msg = await ChatMessage.create(chatData)

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
    return msg?.id ?? msg?._id ?? null
  }


  /**
   *
   * @param config
   */
  static async CODamage (config) {
    let targetMsg = await game.messages.get(config.targetChatId)
    let chatCards = targetMsg.flags.aov.chatCard
    let chatCard = chatCards[Number(config.dataset.card)]
    let newChatCards = []
    let particActor = await AOVactorDetails._getParticipant(
      chatCard.particId,
      chatCard.particType
    )


    //Trigger a damage roll
    let newMsg = await AOVCheck._trigger({
      rollType: RollType.DAMAGE,
      cardType: CardType.UNOPPOSED,
      shiftKey: false,
      actor: particActor,
      token: particActor.token,
      characteristic: false,
      combatAction: chatCard.combatAction,
      skillId: chatCard.skillId,
      targetId: chatCard.targetId,
      targetType: chatCard.targetType,
      targetWpnId: chatCard.targetWpnId,
      successLevel: (chatCard.successLevel).toString(),
      wpnBlock: chatCard.wpnBlock,
      wpnDam: chatCard.wpnDam,
      armourBlock: chatCard.armourBlock,
      damageCF: chatCard.damageCF,
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

  //Update the original Combat Chat Card
  /**
   *
   * @param config
   */
  static async resolveDam (config) {
    let targetMsg = await game.messages.get(config.targetChatId)
    let chatCards = targetMsg.flags.aov.chatCard
    let newChatCards = []
    for (let i of chatCards) {
      i.rollDamage = false
      i.targetWpnId = config.targetWpnId
      newChatCards.push(i)
    }
    await targetMsg.update({
      'flags.aov.chatCard': newChatCards
    })
    const pushhtml = await AOVCheck.startChat(targetMsg.flags.aov)
    await targetMsg.update({ content: pushhtml })
  }



  /**
   *
   * @param config
   */
  static async resolveFum (config) {
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


  /**
   *
   * @param config
   */
  static async COHitLoc (config) {
    let targetMsg = await game.messages.get(config.targetChatId)
    let chatCards = targetMsg.flags.aov.chatCard
    let chatCard = chatCards[0]
    let newChatCards = []
    let av = 0
    let thisUser = game.users.get(chatCard.origID)
    let targetActor = await AOVactorDetails._getParticipant(
      chatCard.targetId,
      chatCard.targetType
    )
    if (targetActor) {
      let locList = await targetActor.items.filter(itm => itm.type==='hitloc')
      let targetLocList = []
      //If we used a Aimed Attack
      if(['aimedLimb', 'aimedTorso'].includes(chatCard.combatAction)) {
        if (chatCard.combatAction === 'aimedLimb') {
          targetLocList = await locList.filter(itm => itm.system.locType==='limb')
        } else {
          targetLocList = await locList.filter(itm => (itm.system.locType!='limb'&&itm.system.locType!='general'))
        }
        if (targetLocList.length >0) {
          let destination = 'systems/aov/templates/dialog/hitlocSelect.hbs'
          let data = {
            headTitle: game.i18n.localize('AOV.aimedAttack'),
            healing: false,
            locList: targetLocList
          }
          const html = await foundry.applications.handlebars.renderTemplate(destination, data)
          const selected = await AOVDialog.input({
            window: { title: game.i18n.localize('AOV.aimedAttack') },
            content: html,
            ok: {
              label: game.i18n.localize('AOV.confirm')
            }
          })
          if(!selected) {return}
          let hitLoc = targetActor.items.get(selected.selectItem)
          if (!hitLoc) {return}
          chatCard.targetLoc = hitLoc.name + ' (' + targetActor.name +')'
          chatCard.targetLocID = selected.selectItem
          if (targetActor.type==='npc') {
            av = hitLoc.system.npcAP
          } else {
            av = hitLoc.system.map
          }
        } else {
          //If there's no selectable hit locations then default to normal attack
          ui.notifications.warn(game.i18n.localize('AOV.noSelectableLocations'))
          chatCard.combatAction = 'attack'
        }
      }

      if (!['aimedLimb', 'aimedTorso'].includes(chatCard.combatAction)) {
        //Otherwise make a roll
        let roll = new Roll('1D20')
        await roll.evaluate()
        if (game.modules.get('dice-so-nice')?.active) {
          game.dice3d.showForRoll(roll, thisUser, true, null, false)
        }
        let locRR = roll.total
        let locName = ''
        let targetLocID = ''
        for (let locItem of locList) {
          if (locRR >= locItem.system.lowRoll && locRR <= locItem.system.highRoll) {
            locName = locItem.name + ' (' + targetActor.name +') '
            locName = locName + ' (' + locRR + ')'
            targetLocID = locItem._id
            if (targetActor.type==='npc') {
              av = locItem.system.npcAP
            } else {
              av = locItem.system.map
            }
          }
        }
        chatCard.targetLoc = locName
        chatCard.targetLocID = targetLocID
      }

      //Check to see if Armour can absord
      if(chatCard.armourBlock) {
        //Set amount blocked to min of Damage and Armour Value on Location & update Damage
        chatCard.armourAbsorb = Math.min(chatCard.rollVal, av)
        chatCard.rollVal = chatCard.rollVal - chatCard.armourAbsorb
      }

      newChatCards.push(chatCard)

      let newState = 'closed'
      //Built in prep of "apply damage" rules
      if (game.settings.get('aov', 'autoDmg')) {newState = 'applyDmg'};
      await targetMsg.update({
        'flags.aov.chatCard': newChatCards,
        'flags.aov.state': newState
      })
      const pushhtml = await AOVCheck.startChat(targetMsg.flags.aov)
      await targetMsg.update({ content: pushhtml })
    }
  }


  /**
   *
   * @param config
   */
  static async COWeaponDamaged (config) {
    let targetActor = await AOVactorDetails._getParticipant(
      config.targetId,
      config.targetType
    )
    let targetImg = await AOVactorDetails.getParticImg(
      config.targetId,
      config.targetType
    )
    let targetWeapon = await targetActor.items.get(config.targetWpnId)
    if (targetWeapon) {
      // wpnDam 0 = target weapon takes no damage, 1 = 1HP if dam done > HP, 2 = Damage Done -weaponHP, 3 = Damage Done
      let damTaken = 0
      switch (config.wpnDam) {
        case 0:
          return
          break
        case 1:
          damTaken = 1
          break
        case 2:
          damTaken = config.damageBeforeAbsorb - Math.max(targetWeapon.system.currHP, 0)
          break
        case 3:
          damTaken = config.damageBeforeAbsorb
      }
      if (damTaken > 0) {
        await targetWeapon.update({ 'system.currHP': targetWeapon.system.currHP -damTaken })
        let chatMsgData = {
          particName: targetActor.name,
          particImg: targetImg,
          weaponName: targetWeapon.name,
          damTaken: damTaken
        }
        let html = await foundry.applications.handlebars.renderTemplate('systems/aov/templates/chat/damagedWeapon.hbs', chatMsgData)
        let chatData = {
          user: game.user.id,
          style: CONST.CHAT_MESSAGE_STYLES.OTHER,
          content: html,
          speaker: {
            actor: config.targetId,
            alias: game.i18n.localize('AOV.weaponDamaged')
          }
        }
        let msg = await ChatMessage.create(chatData)
        ui.chat.render()  //Sometimes chat messages weren't showing - hopefully this solves it
      }
    } else {
      ui.notifications.warn(game.i18n.localize('AOV.noTargetID'))
    }
    return
  }


  //Apply Damage to target
  /**
   *
   * @param config
   */
  static async COApplyDmg (config) {
    let targetMsg = await game.messages.get(config.targetChatId)
    let chatCards = targetMsg.flags.aov.chatCard
    let chatCard = chatCards[0]
    let newChatCards = []
    let targetActor = await AOVactorDetails._getParticipant(
      chatCard.targetId,
      chatCard.targetType
    )
    if (!targetActor) {
      ui.notifications.warn(game.i18n.localize('AOV.noTargetID'))
      return
    }
    let confirm = await AOVDamage.addWound(targetActor, chatCard.targetLocID, chatCard.rollVal)
    if (confirm) {
      await targetMsg.update({
        'flags.aov.state': 'closed'
      })
      const pushhtml = await AOVCheck.startChat(targetMsg.flags.aov)
      await targetMsg.update({ content: pushhtml })
    }
    return
  }


  //Make a table roll display if Dice so Nice active and return the roll
  /**
   *
   * @param table
   */
  static async tableDiceRoll (table) {
    const tableResults = await table.roll()
    if (game.modules.get('dice-so-nice')?.active) {
      game.dice3d.showForRoll(tableResults.roll, game.user, true, null, false)
    }
    return tableResults
  }

}
