import { SkillsSelectDialog } from '../actor/skill-selector.mjs'
import AOVDialog from '../setup/aov-dialog.mjs'
import { AOVUtilities } from '../apps/utilities.mjs'
import { AOVSelectLists } from '../apps/select-lists.mjs'

const EQUIPMENT_TYPES = new Set(['armour', 'gear', 'weapon'])
const STORAGE_ACTOR_TYPES = new Set(['farm', 'party', 'ship'])
const BLOCKED_TRANSFER_TYPES = new Set(['history', 'homeland', 'species', 'weaponcat'])
const CID_REQUIRED_TRANSFER_TYPES = new Set(['devotion', 'npcpower', 'passion', 'rune', 'skill'])
const CID_UNIQUE_TRANSFER_TYPES = new Set(['devotion', 'passion', 'skill'])
const TRANSFER_DESTINATIONS = Object.freeze({
  character: new Set([
    'armour', 'devotion', 'family', 'gear', 'hitloc', 'passion', 'rune',
    'runescript', 'seidur', 'skill', 'weapon', 'wound'
  ]),
  npc: new Set(['devotion', 'gear', 'hitloc', 'npcpower', 'passion', 'skill', 'weapon']),
  party: EQUIPMENT_TYPES,
  farm: new Set([...EQUIPMENT_TYPES, 'thrall']),
  ship: EQUIPMENT_TYPES
})

export class AOVActorItemDrop {

  /**
   * Prepare an exact embedded-Item move without invoking template-copy rules.
   * Returns null after notifying the user when the move is invalid.
   * @param {Item} item
   * @param {Actor} destinationActor
   * @returns {object|null}
   */
  static prepareEmbeddedTransfer (item, destinationActor) {
    const sourceActor = item.parent?.documentName === 'Actor' ? item.parent : null
    if (!sourceActor || !destinationActor) return null

    if (BLOCKED_TRANSFER_TYPES.has(item.type)) {
      ui.notifications.warn(game.i18n.format('AOV.ItemTransfer.StructuralBlocked', {
        type: game.i18n.localize(`TYPES.Item.${item.type}`)
      }))
      return null
    }

    const accepted = TRANSFER_DESTINATIONS[destinationActor.type]
    if (!accepted?.has(item.type)) {
      ui.notifications.warn(game.i18n.format('AOV.ItemTransfer.IncompatibleDestination', {
        itemType: game.i18n.localize(`TYPES.Item.${item.type}`),
        actorType: game.i18n.localize(`TYPES.Actor.${destinationActor.type}`)
      }))
      return null
    }

    if (item.type === 'thrall' && (sourceActor.type !== 'farm' || destinationActor.type !== 'farm')) {
      ui.notifications.warn(game.i18n.localize('AOV.ItemTransfer.ThrallFarmOnly'))
      return null
    }
    if (item.type === 'wound' && (sourceActor.type !== 'character' || destinationActor.type !== 'character')) {
      ui.notifications.warn(game.i18n.localize('AOV.ItemTransfer.WoundCharacterOnly'))
      return null
    }
    if (item.type === 'hitloc') {
      if (sourceActor.type !== destinationActor.type) {
        ui.notifications.warn(game.i18n.localize('AOV.ItemTransfer.HitLocationActorType'))
        return null
      }
      if (sourceActor.items.some((sourceItem) => sourceItem.type === 'wound' && sourceItem.system.hitLocId === item.id)) {
        ui.notifications.warn(game.i18n.localize('AOV.ItemTransfer.HitLocationHasWounds'))
        return null
      }
    }

    const cid = item.flags.aov?.cidFlag?.id
    if (CID_REQUIRED_TRANSFER_TYPES.has(item.type) && !cid) {
      ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.noCIDFlag', { itemName: item.name }))
      return null
    }
    if (CID_UNIQUE_TRANSFER_TYPES.has(item.type) && destinationActor.items.some(
      (destinationItem) => destinationItem.flags.aov?.cidFlag?.id === cid
    )) {
      ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.dupItem', { itemName: `${item.name}(${cid})` }))
      return null
    }
    if (item.type === 'hitloc' && AOVActorItemDrop.#findMatchingHitLocations(item, destinationActor).length) {
      ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.dupItem', { itemName: item.name }))
      return null
    }

    const itemData = item.toObject()
    delete itemData._id
    if (STORAGE_ACTOR_TYPES.has(destinationActor.type) && EQUIPMENT_TYPES.has(item.type)) {
      itemData.system.equipStatus = 3
    }

    if (item.type === 'wound') {
      const sourceHitLocation = sourceActor.items.get(item.system.hitLocId)
      const matches = sourceHitLocation
        ? AOVActorItemDrop.#findMatchingHitLocations(sourceHitLocation, destinationActor)
        : []
      if (matches.length !== 1) {
        ui.notifications.warn(game.i18n.localize('AOV.ItemTransfer.WoundHitLocationMissing'))
        return null
      }
      itemData.system.hitLocId = matches[0].id
    }

    return itemData
  }

  /**
   * Find destination hit locations by CID, then by an exact structural tuple.
   * @param {Item} sourceHitLocation
   * @param {Actor} destinationActor
   * @returns {Item[]}
   */
  static #findMatchingHitLocations (sourceHitLocation, destinationActor) {
    const hitLocations = destinationActor.items.filter((item) => item.type === 'hitloc')
    const cid = sourceHitLocation.flags.aov?.cidFlag?.id
    if (cid) {
      const cidMatches = hitLocations.filter((item) => item.flags.aov?.cidFlag?.id === cid)
      if (cidMatches.length) return cidMatches
    }
    return hitLocations.filter((item) => (
      item.name === sourceHitLocation.name &&
      item.system.lowRoll === sourceHitLocation.system.lowRoll &&
      item.system.highRoll === sourceHitLocation.system.highRoll &&
      item.system.locType === sourceHitLocation.system.locType
    ))
  }

  // Change default on Drop Item Create routine for requirements (single items and folder drop)-----------------------------------------------------------------
  /**
   *
   * @param itemData
   * @param actor
   */
  static async _AOVonDropItemCreate (itemData, actor) {
    const newItemData = []
    itemData = itemData instanceof Array ? itemData : [itemData]
    for (let thisItem of itemData) {
      let nItm = thisItem.toObject()
      let nItmCidFlag = nItm.flags.aov?.cidFlag?.id
      const isFarmThrall = actor.type === 'farm' && nItm.type === 'thrall'
      const isStorageEquipment = ['farm', 'ship'].includes(actor.type) && EQUIPMENT_TYPES.has(nItm.type)

      //Can't drop certain types of items on any actors
      if (['wound', 'runescript', 'seidur', 'thrall', 'family', 'weaponcat'].includes(nItm.type) && !isFarmThrall) {
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.cantTransfer', { itemType: game.i18n.localize('TYPES.Item.' + nItm.type) }))
        continue
      }

      //Don't let skill groups be added
      if (['skill'].includes(nItm.type)) {
        if (nItm.system.category === 'zzz') {
          ui.notifications.warn(game.i18n.localize('AOV.ErrorMsg.noGroupSkill'))
          continue
        }
      }

      //Can't drop certain item types on anything but a character
      if (['homeland', 'species', 'history'].includes(nItm.type) && actor.type != 'character') {
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.characterOnly', { itemType: game.i18n.localize('TYPES.Item.' + nItm.type) }))
        continue
      }

      //Can only add certain item types during Creation Phase
      if (['homeland', 'species'].includes(nItm.type) && !game.settings.get('aov', 'createEnabled')) {
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.createOnly', { itemType: game.i18n.localize('TYPES.Item.' + nItm.type) }))
        continue
      }

      //Check Dropped item has a Chaosium ID, if not then don't add it
      if (!nItmCidFlag && !isFarmThrall && !isStorageEquipment) {
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.noCIDFlag', { itemName: nItm.name }))
        continue
      }

      //Only let a Species be added if there isn't one already
      if (nItm.type === 'species' && actor.system.speciesID) {
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.speciesExists', { type: game.i18n.localize('TYPES.Item.' + nItm.type) }))
        continue
      }

      //Only let a Homeland be added if there isn't one already
      if (nItm.type === 'homeland' && actor.system.homeID) {
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.speciesExists', { type: game.i18n.localize('TYPES.Item.' + nItm.type) }))
        continue
      }

      //Farms store physical equipment and Thralls only.
      if (actor.type === 'farm' && !isFarmThrall && !isStorageEquipment) {
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.cantDropItem', { itemType: game.i18n.localize('TYPES.Item.' + nItm.type), actorType: game.i18n.localize('TYPES.Actor.' + actor.type) }))
        continue
      }

      //Ships store physical equipment only.
      if (actor.type === 'ship' && !isStorageEquipment) {
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.cantDropItem', { itemType: game.i18n.localize('TYPES.Item.' + nItm.type), actorType: game.i18n.localize('TYPES.Actor.' + actor.type) }))
        continue
      }

      //Check for duplicate passions, histories, hit-locations and devotions
      if (['passion', 'devotion', 'hitloc', 'history'].includes(nItm.type)) {
        let currentList = await actor.items.filter(i => i.flags.aov?.cidFlag?.id === nItmCidFlag)
        if (currentList.length > 0) {
          ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.dupItem', { itemName: (nItm.name + '(' + nItmCidFlag + ')') }))
          continue
        }
      }

      //If a specialised skill then ask for specialisation
      if (['skill'].includes(nItm.type)) {
        if (nItm.system.specSkill && (nItm.system.specialisation === '' || nItm.system.specialisation === game.i18n.localize('AOV.specify'))) {
          nItm = await this._getSpecialism(nItm, actor)
          nItmCidFlag = nItm.flags.aov?.cidFlag?.id
        }
      }

      //Check for duplicate skills, but not specialised skills that have a specialisation name added
      if (['skill'].includes(nItm.type)) {
        if (!nItm.system.specSkill || (nItm.system.specSkill && (nItm.system.specialisation != '' && nItm.system.specialisation != game.i18n.localize('AOV.specify')))) {
          let currentList = await actor.items.filter(i => i.flags.aov?.cidFlag?.id === nItmCidFlag)
          if (currentList.length > 0) {
            ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.dupItem', { itemName: (nItm.name + '(' + nItmCidFlag + ')') }))
            continue
          }
        }
      }

      //If adding a skill and it's a character then calculate the base score
      if (actor.type === 'character' && nItm.type === 'skill') {
        nItm.system.base = await this._AOVcalcBase(nItm, actor)
      }

      //If it's a weapon
      if (nItm.type === 'weapon') {
        //Directory/template copies start at maximum HP.
        nItm.system.currHP = nItm.system.maxHP
        //Check if Character has the relevant skill and if not then add it
        if (actor.type === 'character') {
          let currentList = await actor.items.filter(i => i.flags.aov?.cidFlag?.id === nItm.system.skillCID)
          if (currentList.length < 1) {
            let extraSkill = await game.aov.cid.fromCID(nItm.system.skillCID)
            if (extraSkill.length > 0) {
              let xItm = extraSkill[0].toObject()
              xItm.system.base = await this._AOVcalcBase(xItm, actor)
              newItemData.push(xItm)
            }
          }
        }
      }

      if (isStorageEquipment) nItm.system.equipStatus = 3

      //If it's a devotion check to see if linked skill needs adding
      if (nItm.type === 'devotion') {
        if (nItm.system.skills[0]) {
          let currentList = await actor.items.filter(i => i.flags.aov?.cidFlag?.id === nItm.system.skills[0].cid)
          if (currentList.length < 1) {
            let extraSkill = await game.aov.cid.fromCID(nItm.system.skills[0].cid)
            if (extraSkill.length > 0) {
              let xItm = extraSkill[0].toObject()
              xItm.system.base = await this._AOVcalcBase(xItm, actor)
              newItemData.push(xItm)
            }
          }
        }
      }

      //If it's a species then set ability formula and min/max
      if (nItm.type === 'species') {
        await AOVActorItemDrop._dropSpecies(nItm, actor)
      }

      //If it's a homeland then add additional relevant items.
      if (nItm.type === 'homeland') {
        let addHome = await AOVActorItemDrop._dropHomeland(nItm, actor)
        if (!addHome) {
          ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.selectionFailed', { type: game.i18n.localize('TYPES.Item.' + nItm.type) }))
          continue
        }
      }

      //If it's a history item the add relevant skills etc
      if (nItm.type === 'history') {
        let addHistory = await AOVActorItemDrop._dropHistory(nItm, actor)
        if (!addHistory) {
          ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.selectionFailed', { type: game.i18n.localize('TYPES.Item.' + nItm.type) }))
          continue
        }
        nItm.system.source = 'history'
      }


      //If we've got this far then the item can be added
      //
      //
      newItemData.push(nItm)
    }
    return (newItemData)
  }

  //Set base percentage of skill
  /**
   *
   * @param item
   * @param actor
   */
  static async _AOVcalcBase (item, actor) {
    let base = 0
    switch (item.system.baseVal) {
      case 'dex2':
        return actor.system.abilities.dex.total * 2
      case 'dex3':
        return actor.system.abilities.dex.total * 3
    }
    return item.system.base
  }

  //Activities from adding a Species
  /**
   *
   * @param itm
   * @param actor
   */
  static async _dropSpecies (itm, actor) {
    let changes = {}
    let newHitLocs = []
    //Update dice formulae and min/max values
    for (let [key, ability] of Object.entries(itm.system.abilities)) {
      if (ability.formula != '') {
        changes = Object.assign(changes, {
          [`system.abilities.${key}.formula`]: ability.formula,
          [`system.abilities.${key}.min`]: ability.min,
          [`system.abilities.${key}.max`]: ability.max
        })
      }
    }
    await actor.update(changes)

    //Now add any missing hit locations
    for (let hitLoc of itm.system.hitlocs) {
      let currentList = await actor.items.filter(i => i.flags.aov?.cidFlag?.id === hitLoc.cid)
      if (currentList.length > 0) { continue }
      let tempLoc = (await game.aov.cid.fromCIDBest({ cid: hitLoc.cid }))[0]
      if (tempLoc) {
        newHitLocs.push(tempLoc)
      }
    }
    await Item.createDocuments(newHitLocs, { parent: actor })
    return
  }

  //Activities from adding a Homeland
  /**
   *
   * @param itm
   * @param actor
   */
  static async _dropHomeland (itm, actor) {

    //Get the selected skills
    let picks = 6
    let selectOptions = []
    let skillList = []
    let addItems = []
    let updateItems = []


    //Prep the list of skills to choose from
    for (let skillOpt of itm.system.skills) {
      let tempSkill = (await game.aov.cid.fromCIDBest({ cid: skillOpt.cid }))[0]
      if (tempSkill) { selectOptions.push({ id: skillOpt.cid, selected: false, name: tempSkill.name, bonus: 25 }) }
    }
    selectOptions = selectOptions.sort(function (a, b) { return a.name.localeCompare(b.name) })

    // Get the selections via dialog
    let selectedSkill = await SkillsSelectDialog.create(selectOptions, picks, game.i18n.localize('AOV.skills'), '')
    if (!selectedSkill) {
      return false
    }

    //Loop through the selected skills and set the homeland score to 25
    for (let nSkill of selectedSkill) {
      let newSkill = (await game.aov.cid.fromCIDBest({ cid: nSkill.id }))[0]
      if (newSkill) {
        let placeholder = foundry.utils.duplicate(newSkill)
        placeholder.system.home = nSkill.bonus

        //If a Weapon Group skill then make another dialog
        if (newSkill.system.category === 'zzz') {
          let groupSkills = []
          for (let skillOpt of newSkill.system.skills) {
            let tempSkill = (await game.aov.cid.fromCIDBest({ cid: skillOpt.cid }))[0]
            if (tempSkill) { groupSkills.push({ id: skillOpt.cid, selected: false, name: tempSkill.name, bonus: 25 }) }
          }
          groupSkills = groupSkills.sort(function (a, b) { return a.name.localeCompare(b.name) })
          selectedSkill = await SkillsSelectDialog.create(groupSkills, newSkill.system.picks, game.i18n.localize('AOV.weapons'), '')
          if (!selectedSkill) {
            return false
          }
          for (let wSkill of selectedSkill) {
            let tempSkill = (await game.aov.cid.fromCIDBest({ cid: wSkill.id }))[0]
            if (tempSkill) {
              let weaponSkill = foundry.utils.duplicate(tempSkill)
              weaponSkill.system.home = nSkill.bonus
              skillList.push(weaponSkill)
            }
          }
        } else {
          skillList.push(placeholder)
        }
      }
    }

    //If an existing skill then push to updateItems otherwise calculate base score and push to addItems
    for (let nItm of skillList) {

      //If a specialism skill and specialism is blank
      if (nItm.system.specSkill && (nItm.system.specialisation === '' || nItm.system.specialisation === game.i18n.localize('AOV.specify'))) {
        nItm = await this._getSpecialism(nItm, actor)
      }

      //Check if skill exists on actor
      let actorItem = await (actor.items.filter(i => i.flags.aov?.cidFlag?.id === nItm.flags.aov?.cidFlag?.id))[0]
      if (actorItem) {
        updateItems.push({ _id: actorItem._id, 'system.home': nItm.system.home })
      } else {
        nItm.system.base = await this._AOVcalcBase(nItm, actor)
        addItems.push(nItm)
      }
    }

    for (let passion of itm.system.passions) {
      let currentList = await actor.items.filter(i => i.flags.aov?.cidFlag?.id === passion.cid)
      //If the passion exists on the character then we want to update the homeland score to 60
      if (currentList.length > 0) {
        updateItems.push({ _id: currentList[0]._id, 'system.home': 60 })
      } else {
      //Otherwsie add the passion
        let newPass = (await game.aov.cid.fromCIDBest({ cid: passion.cid }))[0]
        if (newPass) {
          let newPassion = foundry.utils.duplicate(newPass)
          newPassion.system.home = 60
          addItems.push(newPassion)
        }
      }
    }
    for (let equip of itm.system.equipment) {
      let newEquip = (await game.aov.cid.fromCIDBest({ cid: equip.cid }))[0]
      if (newEquip) {
        let newItem = foundry.utils.duplicate(newEquip)
        newItem.system.source = 'home'
        addItems.push(newItem)
      }
    }

    await Item.updateDocuments(updateItems, { parent: actor })
    await Item.createDocuments(addItems, { parent: actor })

    return true
  }


  //Get Specialism Name for Specialism Skill
  /**
   *
   * @param newSkill
   * @param actor
   */
  static async _getSpecialism (newSkill, actor) {
    let title = game.i18n.format('AOV.getSpecialism', { entity: newSkill.name })
    const dlg = await AOVDialog.input(
      {
        window: { title: title },
        content: '<input class="centre" type="text" name="entry">',
        ok: {
          label: game.i18n.localize('AOV.confirm')
        }
      }
    )
    if (dlg) {
      newSkill.system.specialisation = dlg.entry
      let cidName = newSkill.system.mainName + ' (' + dlg.entry + ')'
      newSkill.flags.aov.cidFlag.id = 'i.skill.' + await AOVUtilities.toKebabCase(cidName)
      newSkill.name = cidName
    }
    return newSkill
  }

  //Activities from adding a History
  /**
   *
   * @param itm
   * @param actor
   */
  static async _dropHistory (itm, actor) {
    let newItems = []
    let updateItems = []
    let brief = '<p><strong>' + itm.name + '</strong></p><p>' + itm.system.description+ '</p>'

    for (let nSkill of itm.system.skills) {


      let grpSkill = (await game.aov.cid.fromCIDBest({ cid: nSkill.cid }))[0]
      let picked = nSkill.cid
      let bonusFormula = nSkill.bonus

      //If the skill is a group skill
      if (grpSkill.system.category === 'zzz') {

        let groupSkills = []
        for (let skillOpt of grpSkill.system.skills) {
          let tempSkill = (await game.aov.cid.fromCIDBest({ cid: skillOpt.cid }))[0]
          if (tempSkill) {
            groupSkills.push({ id: skillOpt.cid, selected: false, name: tempSkill.name, bonus: 0 }) }
        }
        groupSkills = groupSkills.sort(function (a, b) { return a.name.localeCompare(b.name) })
        let selectedSkill = await SkillsSelectDialog.create(groupSkills, grpSkill.system.picks, game.i18n.localize('AOV.chooseBonus') +': ' + nSkill.bonus + '%', brief)
        if (!selectedSkill) {
          continue
        }
        //At the moment only take the first picked skill - assumes there won't be multiple picks
        picked = selectedSkill[0].id
      }

      //Hard coded special to deal with fire event
      if (nSkill.cid === 'i.skill.fire-event') {
        if (picked === 'i.skill.ride') {
          bonusFormula = '-1D4'
          picked = 'i.skill.worship-freyr'
          let existSkill = await actor.items.filter(itm => itm.type==='skill').filter(itm => itm.flags.aov?.cidFlag?.id === 'i.skill.ride')
          if(existSkill.length>0) {
            updateItems.push({ _id: existSkill[0]._id, 'system.history': existSkill[0].system.history + 15 })
          } else {
            let newSkill = (await game.aov.cid.fromCIDBest({ cid: 'i.skill.ride' }))[0]
            if (newSkill) {
              let addSkill = foundry.utils.duplicate(newSkill)
              addSkill.system.history = 15
              newItems.push(addSkill)
            }
          }
        } else if (picked === 'i.skill.worship-freyr') {
          bonusFormula = '1D6'
          picked = 'i.skill.worship-freyr'
        }
      }

      let bonusRoll = new Roll(bonusFormula)
      await bonusRoll.evaluate()
      let existSkill = await actor.items.filter(itm => itm.type==='skill').filter(itm => itm.flags.aov?.cidFlag?.id === picked)
      if(existSkill.length>0) {
        updateItems.push({ _id: existSkill[0]._id, 'system.history': existSkill[0].system.history + bonusRoll.total })
      } else {
        let newSkill = (await game.aov.cid.fromCIDBest({ cid: picked }))[0]
        if (newSkill) {
          let addSkill = foundry.utils.duplicate(newSkill)
          addSkill.system.history = bonusRoll.total
          newItems.push(addSkill)
        }
      }
    }

    for (let nPass of itm.system.passions) {
      let bonusFormula = nPass.bonus
      if (bonusFormula === '') {
        bonusFormula = '60'
      }
      let bonusRoll = new Roll(bonusFormula)
      await bonusRoll.evaluate()

      let existPass = await actor.items.filter(itm => itm.type==='passion').filter(itm => itm.flags.aov?.cidFlag?.id === nPass.cid)
      if(existPass.length>0) {
        let newBonus = bonusRoll.total
        if (nPass.bonus === '') {
          newBonus = Math.max(60-existPass[0].system.history, 10)
        }
        let update = Math.min(Math. max(100-existPass[0].system.total, 0), newBonus)
        updateItems.push({ _id: existPass[0]._id, 'system.history': existPass[0].system.history + update })
      } else {
        let newPass = (await game.aov.cid.fromCIDBest({ cid: nPass.cid }))[0]
        if (newPass) {
          let addPass = foundry.utils.duplicate(newPass)
          addPass.system.history = bonusRoll.total
          newItems.push(addPass)
        }
      }
    }

    for (let nEquip of itm.system.equipment) {
      let newEquip = (await game.aov.cid.fromCIDBest({ cid: nEquip.cid }))[0]
      if (newEquip) {
        let addEquip = foundry.utils.duplicate(newEquip)
        addEquip.system.source = 'history'
        newItems.push(addEquip)
      }
    }

    if (itm.system.reputation) {
      if (!Roll.validate(itm.system.reputation)) {
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.invalidFormula', { type: game.i18n.localize('TYPES.Item.history') }))
      } else {
        let repRoll = new Roll(itm.system.reputation)
        await repRoll.evaluate()
        let newRep = repRoll.total + actor.system.reputation.history
        await actor.update({ 'system.reputation.history' : newRep })
      }

    }
    await Item.updateDocuments(updateItems, { parent: actor })
    await Item.createDocuments(newItems, { parent: actor })
    return true
  }

}
