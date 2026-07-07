import AOVDialog from '../setup/aov-dialog.mjs'
import { AOVUtilities } from './utilities.mjs'
import { AOVCharCreate } from '../actor/charCreate.mjs'
import { AOVactorDetails } from './actor-details.mjs'

export class AOVDamage {

  /**
   *
   */
  static async healingPhase () {
    const confirm = await AOVDialog.confirm({
      window: { title: game.i18n.localize('AOV.confirm') },
      content: game.i18n.localize('AOV.healingPhase')
    })
    if (!confirm) {
      return
    }
    for (let actor of game.actors) {
      if (actor.type !== 'character') {continue}
      await AOVDamage.healrateChar(actor)

    }
    //Update character sheets
    game.socket.emit('system.aov', {
      type: 'healChar'
    })
    AOVUtilities.updateCharSheets(false)
  }


  /**
   *
   * @param actor
   */
  static async healrateChar (actor) {

    let updateItems = []
    let deleteItems = []
    let healing = []
    let hitLocs = actor.items.filter(itm => itm.type==='hitloc')
    for (let hitLoc of hitLocs) {
      let wounds = actor.items.filter(itm => itm.type==='wound').filter(wItm => wItm.system.hitLocId === hitLoc._id)
      if (wounds.length <1) {continue}
      //Sort the wounds by damage value
      wounds.sort(function (a, b) {
        let x = a.system.damage
        let y = b.system.damage
        if (x < y) { return -1 };
        if (x > y) { return 1 };
        return 0
      })
      let healTot = actor.system.healRate
      for (let wound of wounds) {
        updateItems.push ({ _id: wound._id, 'system.treated': true })
        let heal = Math.min(wound.system.damage, healTot)
        let damage = wound.system.damage - heal
        healTot = healTot - heal
        if (heal > 0) {
          healing.push({
            locName: hitLoc.name,
            damage: wound.system.damage,
            healed: heal,
            newDam: damage
          })
        }
        if (damage < 1) {
          deleteItems.push(wound.id)
        } else {
          updateItems.push ({ _id: wound._id, 'system.damage': damage })
        }
      }
    }
    await Item.updateDocuments(updateItems, { parent: actor })
    await Item.deleteDocuments(deleteItems, { parent: actor })

    if (healing.length > 0) {
      //Create Chat Message
      let msgData = {
        particName: actor.name,
        particImg: actor.img,
        results: healing
      }
      let rolls = {}
      let html = await foundry.applications.handlebars.renderTemplate('systems/aov/templates/chat/character-healing.hbs', msgData)
      let msg = await AOVCharCreate.showStats(html, rolls, game.i18n.localize('AOV.weeklyHealing'), actor._id)
    }
    return
  }

  /**
   *
   * @param actor
   * @param hitLocId
   * @param damage
   */
  static async addWound (actor, hitLocId, damage) {
    let targetHitLoc = await actor.items.get(hitLocId)
    if (!targetHitLoc) {
      ui.notifications.warn(game.i18n.localize('AOV.noHitLocID'))
      return false
    }

    let hlCurrHP = targetHitLoc.system.currHP
    let hlMaxHP = targetHitLoc.system.hpMax
    let maxDamage = damage

    //Limit limb damage to twice the max HP in the location
    if (targetHitLoc.system.locType === 'limb') {
      maxDamage = Math.min(damage, hlMaxHP *2)
    }

    if (actor.type === 'npc') {

      await targetHitLoc.update({ 'system.npcDmg': targetHitLoc.system.npcDmg + maxDamage })
    } else {
      const docCls = getDocumentClass('Item')
      const docData = {
        name: docCls.defaultName({
          type: 'wound',
          parent: actor
        }),
        type: 'wound',
        system: {
          hitLocId: hitLocId,
          damage: maxDamage
        }
      }
      // Create the embedded document
      const newItem = await docCls.create(docData, { parent: actor })

      if (game.settings.get('aov', 'actorItemCID')) {
        let key = await game.aov.cid.guessId(newItem)
        await newItem.update({
          'flags.aov.cidFlag.id': key,
          'flags.aov.cidFlag.lang': game.i18n.lang,
          'flags.aov.cidFlag.priority': 0
        })
      }
    }
    return true
  }

  //Active Effect Healing
  /**
   *
   * @param effect
   * @param actor
   */
  static async effectHealing (effect, actor) {
    //Roll the amount of healing
    let healing = new Roll(effect.value)
    await healing.evaluate()

    //Get the Target
    let target = await AOVDamage.getVictimId(['character', 'npc'])
    if(!target) {return}

    let targetActor = ''
    let targetActorName = ''
    let hitLocName = ''
    //If a target has been selected
    if (target.victimId != '') {
      targetActor = await AOVactorDetails._getParticipant(
        target.victimId,
        target.victimType
      )
      if (!targetActor) {return false}
      targetActorName = targetActor.name
      //Select hit location
      let hitLoc = await AOVDamage.selectHitLoc(targetActor, true)
      if (!hitLoc) {return false}
      hitLocName = hitLoc.name

      if (game.user.isGM) {
        await AOVDamage.healHitLoc(target.victimId, target.victimType, hitLoc._id, healing.total)
      } else {
        const availableGM = game.users.find(d => d.active && d.isGM)?.id
        if (availableGM) {
          let config = {
            targetActorId: target.victimId,
            targetActorType: target.victimType,
            hitlocID: hitLoc._id,
            healingVal: healing.total
          }
          game.socket.emit('system.aov', {
            type: 'healHitLoc',
            to: availableGM,
            value: { config }
          })
        } else {
          ui.notifications.warn(game.i18n.localize('AOV.noAvailableGM'))
        }
      }
    }
    //Show Chat Card
    let msg = AOVDamage.showAECard(effect, healing, actor, targetActorName, hitLocName)
    return true
  }

  //Active Effect Damage Hit Location
  /**
   *
   * @param effect
   * @param actor
   */
  static async effectDamage (effect, actor) {
    //Roll the amount of healing
    let damage = new Roll(effect.value)
    await damage.evaluate()

    //Get the Target
    let target = await AOVDamage.getVictimId(['character', 'npc'])
    if(!target) {return}

    let targetActor = ''
    let targetActorName = ''
    let hitLocName = ''
    //If a target has been selected
    if (target.victimId != '') {
      targetActor = await AOVactorDetails._getParticipant(
        target.victimId,
        target.victimType
      )
      if (!targetActor) {return false}
      targetActorName = targetActor.name
      //Select hit location
      let hitLoc = await AOVDamage.selectHitLoc(targetActor, false)
      if (!hitLoc) {return false}
      hitLocName = hitLoc.name

      if (game.user.isGM) {
        await AOVDamage.injureHitLoc(target.victimId, target.victimType, hitLoc._id, damage.total)
      } else {
        const availableGM = game.users.find(d => d.active && d.isGM)?.id
        if (availableGM) {
          let config = {
            targetActorId: target.victimId,
            targetActorType: target.victimType,
            hitlocID: hitLoc._id,
            healingVal: damage.total
          }
          game.socket.emit('system.aov', {
            type: 'injureHitLoc',
            to: availableGM,
            value: { config }
          })
        } else {
          ui.notifications.warn(game.i18n.localize('AOV.noAvailableGM'))
        }
      }
    }
    //Show Chat Card
    let msg = AOVDamage.showAECard(effect, damage, actor, targetActorName, hitLocName)
    return true
  }

  //Active Effect Damage Object
  /**
   *
   * @param effect
   * @param actor
   */
  static async damageObject (effect, actor) {
    //Roll the amount of healing
    let damage = new Roll(effect.value)
    await damage.evaluate()
    let msg = AOVDamage.showAECard(effect, damage, actor, '', '')
    return true
  }

  /**
   *
   * @param filterOption
   */
  static async getVictimId (filterOption) {
    //filterOption = list of acceptable actor types
    if (filterOption.length === 0) {filterOption =['character', 'npc']}
    let victimId = ''
    let victimType = 'none'
    let victimName = ''
    let victim = ''
    if (game.user.targets.size > 0) {
      let victims = await Array.from(game.user.targets).filter(trgt => filterOption.includes(trgt.actor.type))
      if (victims.length === 1) {
        victim = victims[0]
      } else {
        let victimList = await victims.map(itm => {
          return {
            _id: itm.document.uuid,
            name: itm.name
          }})
        let destination = 'systems/aov/templates/dialog/targetSelect.hbs'
        let data = {
          headTitle: game.i18n.localize('AOV.selectTarget'),
          healing: false,
          locList: victimList
        }
        const html = await foundry.applications.handlebars.renderTemplate(destination, data)
        const selected = await AOVDialog.input({
          window: { title: game.i18n.localize('AOV.selectTarget') },
          content: html,
          ok: {
            label: game.i18n.localize('AOV.confirm')
          }
        })
        if(!selected) {return false}
        victim = await (victims.filter(itm => itm.document.uuid === selected.selectItem))[0]
      }

      victimName = victim.document.name
      if (victim.document.actorLink) {
        victimId = victim.document.actorId
        victimType = 'actor'
      } else {
        victimId = victim.id
        victimType = 'token'
      }

    }
    let result =({ victimId, victimType, victimName })
    return result
  }

  /**
   *
   * @param targetActor
   * @param healing
   */
  static async selectHitLoc (targetActor, healing) {
    let hitLocs = []
    let hitLoc = ''
    let headTitle = game.i18n.localize('AOV.healLoc')
    if (healing) {
      if (targetActor.type === 'npc') {
        hitLocs = targetActor.items.filter(itm => itm.type==='hitloc').filter(itm => itm.system.locType !='general').filter(itm => itm.system.npcDmg > 0).map(itm => {
          return {
            _id: itm._id,
            name: itm.name,
            currHp: itm.system.hpMax - itm.system.npcDmg,
            hpMax: itm.system.hpMax,
            damage: itm.system.npcDmg,
            highRoll: itm.system.highRoll
          }})
      } else if (targetActor.type === 'character') {
        hitLocs = targetActor.items.filter(itm => itm.type==='hitloc').filter(itm => itm.system.locType !='general').filter(itm => itm.system.currHp < itm.system.hpMax).map(itm => {
          return {
            _id: itm._id,
            name: itm.name,
            currHp: itm.system.currHp,
            hpMax: itm.system.hpMax,
            damage: itm.system.hpMax - itm.system.currHp,
            highRoll: itm.system.highRoll
          }})
      }
    } else {
      headTitle = game.i18n.localize('AOV.injureLoc')
      hitLocs = targetActor.items.filter(itm => itm.type==='hitloc').filter(itm => itm.system.locType !='general').map(itm => {
        return {
          _id: itm._id,
          name: itm.name,
          highRoll: itm.system.highRoll
        }})
    }

    if (hitLocs.length > 1) {
      //Sort the hitlocs by D20 location
      hitLocs.sort(function (a, b) {
        let x = a.highRoll
        let y = b.highRoll
        if (x < y) { return 1 };
        if (x > y) { return -1 };
        return 0
      })
      let destination = 'systems/aov/templates/dialog/hitlocSelect.hbs'
      let data = {
        headTitle,
        healing,
        locList: hitLocs
      }
      const html = await foundry.applications.handlebars.renderTemplate(destination, data)
      const selected = await AOVDialog.input({
        window: headTitle,
        content: html,
        ok: {
          label: game.i18n.localize('AOV.confirm')
        }
      })
      if(!selected) {return false}
      hitLoc = await targetActor.items.get(selected.selectItem)
    } else if (hitLocs.length === 1){
      hitLoc = await targetActor.items.get(hitLocs[0]._id)
    } else {
      if (healing) {
        ui.notifications.warn(game.i18n.format('AOV.noWounds', { name: targetActor.name }))
      } else {
        ui.notifications.warn(game.i18n.format('AOV.noHitLoc', { name: targetActor.name }))
      }
      return false
    }
    return hitLoc
  }

  /**
   *
   * @param targetActorId
   * @param targetActorType
   * @param hitlocID
   * @param amount
   */
  static async healHitLoc (targetActorId, targetActorType, hitlocID, amount) {
    let targetActor = await AOVactorDetails._getParticipant(
      targetActorId,
      targetActorType
    )
    let hitloc = await targetActor.items.get(hitlocID)
    let updateItems =[]
    let deleteItems = []
    if (targetActor.type === 'npc') {
      let newDmg = Math.max(hitloc.system.npcDmg - amount, 0)
      await hitloc.update({ 'system.npcDmg': newDmg })
      return true
    } else if (targetActor.type === 'character') {
      let wounds = targetActor.items.filter(itm => itm.type==='wound').filter(wItm => wItm.system.hitLocId === hitloc._id)
      if (wounds.length <1) {return false}
      //Sort the wounds by damage value
      wounds.sort(function (a, b) {
        let x = a.system.damage
        let y = b.system.damage
        if (x < y) { return -1 };
        if (x > y) { return 1 };
        return 0
      })
      let healTot = amount
      for (let wound of wounds) {
        let heal = Math.min(wound.system.damage, healTot)
        let damage = wound.system.damage - heal
        healTot = healTot - heal
        if (damage < 1) {
          deleteItems.push(wound.id)
        } else {
          updateItems.push ({
            _id: wound._id,
            'system.damage': damage,
            'system.treated': true
          })
        }
      }
      await Item.updateDocuments(updateItems, { parent: targetActor })
      await Item.deleteDocuments(deleteItems, { parent: targetActor })
      return true
    }
    return false
  }

  /**
   *
   * @param targetActorId
   * @param targetActorType
   * @param hitlocID
   * @param amount
   */
  static async injureHitLoc (targetActorId, targetActorType, hitlocID, amount) {
    let targetActor = await AOVactorDetails._getParticipant(
      targetActorId,
      targetActorType
    )
    let wound = await AOVDamage.addWound(targetActor, hitlocID, amount)
    return wound
  }



  //Show Active Effect Card
  /**
   *
   * @param effect
   * @param roll
   * @param actor
   * @param targetName
   * @param hitLocName
   */
  static async showAECard (effect, roll, actor, targetName, hitLocName) {
    //Show Chat Card
    const effectKeys = foundry.utils.duplicate(CONFIG.AOV.keysActiveEffects)
    let chatMsgData = {
      chatTemplate: 'systems/aov/templates/chat/activeEffectResult.hbs',
      effType: effect.key,
      formula: effect.value,
      title: game.i18n.localize((effectKeys[effect.key] ?? effect.key)),
      rolls: roll,
      rollResult: roll.total,
      particName: actor.name,
      particImg: actor.img,
      targetName: targetName,
      hitLocName: hitLocName
    }
    let html = await foundry.applications.handlebars.renderTemplate(chatMsgData.chatTemplate, chatMsgData)
    let alias = game.i18n.localize('AOV.activeEffect')
    let chatData = {}
    chatData = {
      user: game.user.id,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: html,
      speaker: {
        actor: actor.id,
        alias: alias
      }
    }
    if (game.modules.get('dice-so-nice')?.active) {
      game.dice3d.showForRoll(roll, game.user, true, null, false)
    }
    let msg = await ChatMessage.create(chatData)
  }

  //Roll Random Hit Location for an actor
  /**
   *
   * @param actor
   */
  static async rollHitLoc (actor) {
    let hitlocs = await actor.items.filter(i => i.type==='hitloc').filter(i => i.system.locType != 'general')
    if (hitlocs.length === 0) {
      ui.notifications.warn(game.i18n.format('AOV.noHitLoc', { name: actor.name }))
      return false
    }
    let roll = new Roll('1D20')
    await roll.evaluate()
    let hitloc = await hitlocs.filter(i => (roll.total >= i.system.lowRoll) && (roll.total <= i.system.highRoll))
    if (hitloc.length === 0) {
      ui.notifications.warn(game.i18n.format('AOV.noHitLocRange', { score: roll.total }))
      return false
    }
    let chatMsgData = {
      chatTemplate: 'systems/aov/templates/chat/rollHitLoc.hbs',
      title: game.i18n.localize('AOV.rollHitLoc'),
      rolls: roll,
      particName: actor.name,
      particImg: actor.img,
      rollResult: roll.total,
      locName: hitloc[0].name
    }
    let html = await foundry.applications.handlebars.renderTemplate(chatMsgData.chatTemplate, chatMsgData)
    let alias = game.i18n.localize('AOV.rollHitLoc')
    let chatData = {}
    chatData = {
      user: game.user.id,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: html,
      speaker: {
        actor: actor.id,
        alias: alias
      }
    }
    if (game.modules.get('dice-so-nice')?.active) {
      game.dice3d.showForRoll(roll, game.user, true, null, false)
    }
    let msg = await ChatMessage.create(chatData)
    return true
  }
}
