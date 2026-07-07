import AOVDialog from '../setup/aov-dialog.mjs'
import { COCard } from '../chat/combat-chat.mjs'
import { StatsSelectDialog } from './actor-usePoints.mjs'
import { AssignDiceDialog } from './actor-assignDice.mjs'
import { PersSkillSelectDialog } from './persskill-selector.mjs'
import { DevotionSelectDialog } from './devotion-selector.mjs'
import { WeaponSelectDialog } from './weapon-selector.mjs'
import { AOVUtilities } from '../apps/utilities.mjs'
import { AOVSelectLists } from '../apps/select-lists.mjs'
import { AOVActorItemDrop } from './actor-item-drop.mjs'
import { AOVCharDevelop } from './charDevelop.mjs'
import { SkillsSelectDialog } from './skill-selector.mjs'

export class AOVCharCreate {

  //Roll Character Name
  /**
   *
   * @param actor
   * @param target
   */
  static async characName (actor, target) {
    let type = target.dataset.type
    let nickNameTable = (await game.aov.cid.fromCIDBest({ cid: 'rt..nicknames' }))[0]
    if (type === 'nickname') {
      if (!nickNameTable) {
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.noTable', { tableCID: 'rt..nicknames' }))
        return
      }
      const tableResults = await COCard.tableDiceRoll(nickNameTable)
      await actor.update({ 'system.nickname': tableResults.results[0].name })
    } else if (type === 'name') {
      let gender = 'other'
      if (game.settings.get('aov', 'binaryGender')) {
        if (['male', 'female'].includes(actor.system.gender)) {
          gender = actor.system.gender
        }
      }
      const tableResults = await AOVCharCreate.rollName(gender)
      if (tableResults) {
        await actor.update({
          'name': tableResults.newName,
          'system.nameMean': tableResults.nameMean
        })
      }
    }
    return
  }

  //Roll Character Name
  /**
   *
   * @param gender
   * @param patrionic
   */
  static async rollName (gender, patrionic) {
    let maleTable = (await game.aov.cid.fromCIDBest({ cid: 'rt..male-names' }))[0]
    let femaleTable = (await game.aov.cid.fromCIDBest({ cid: 'rt..female-names' }))[0]
    let table = ''
    let patrionicTable = ''
    let oneTable = false
    let askPatrionic = true
    let dlg = {}
    //If provided a patrionic name don't ask for about it
    if (patrionic) { askPatrionic = false }

    //Check if we have male and female tables
    if (!maleTable && !femaleTable) {
      ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.noTable', { tableCID: 'rt..male-names and rt.female-names' }))
      return false
    }

    switch (gender) {
      case 'male':
        if (!maleTable) {
          ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.noTable', { tableCID: 'rt..male-names' }))
          return false
        }
        table = maleTable
        patrionicTable = maleTable
        break
      case 'female':
        if (!femaleTable) {
          ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.noTable', { tableCID: 'rt..female-names' }))
          return false
        }
        table = femaleTable
        patrionicTable = femaleTable
        break
      default:
        if (!maleTable) {
          table = femaleTable
          patrionicTable = femaleTable
          oneTable = true
        } else if (!femaleTable) {
          table = maleTable
          patrionicTable = maleTable
          oneTable = true
        }
        let data = {
          oneTable: oneTable,
          askPatrionic: askPatrionic
        }
        const html = await foundry.applications.handlebars.renderTemplate('systems/aov/templates/dialog/nameOptions.hbs', data)
        dlg = await AOVDialog.input(
          {
            window: { title: game.i18n.localize('AOV.charName') },
            content: html,
            ok: {
              label: game.i18n.localize('AOV.rollDice')
            }
          }
        )
        if (!dlg) { return false }
        if (dlg.mainName === 'male') {
          table = maleTable
        } else if (dlg.mainName === 'female') {
          table = femaleTable
        }
        if (dlg.patrionicName === 'male') {
          patrionicTable = maleTable
        } else if (dlg.patrionicName === 'female') {
          patrionicTable = femaleTable
        }
        break
    }



    const tableResults = await COCard.tableDiceRoll(table)
    let nameMean = (tableResults.results[0].description).replace(/(<([^>]+)>)/ig, '')
    let newName = tableResults.results[0].name
    if (!patrionic) {
      const patrionicResult = await COCard.tableDiceRoll(patrionicTable)
      patrionic = patrionicResult.results[0].name
    }


    let lastChar = patrionic.slice(-1)
    let lastTwoChar = patrionic.slice(-2)
    if (lastChar === 'i') {
      patrionic = patrionic.slice(0, patrionic.length - 1) + 'a'
    } else if (lastChar === 'a') {
      patrionic = patrionic.slice(0, patrionic.length - 1) + 'u'
    } else if (lastTwoChar === 'nn') {
      patrionic = patrionic.slice(0, patrionic.length - 2) + 'ns'
    } else if (lastTwoChar === 'll') {
      patrionic = patrionic.slice(0, patrionic.length - 2) + 'ls'
    } else if (lastTwoChar === 'ur') {
      patrionic = patrionic.slice(0, patrionic.length - 2) + 's'
    } else if (lastTwoChar === 'ir') {
      patrionic = patrionic.slice(0, patrionic.length - 2) + 'is'
    }

    if (gender === 'male') {
      patrionic = patrionic + 'son'
    } else if (gender === 'female') {
      patrionic = patrionic + 'dóttir'
    } else if (dlg.suffix === 'son') {
      patrionic = patrionic + 'son'
    } else {
      patrionic = patrionic + 'dóttir'
    }

    newName = newName + ' ' + patrionic

    let results = ({ newName: newName, nameMean: nameMean })
    return results
  }


  //Reset Species
  /**
   *
   * @param target
   * @param actor
   */
  static async resetSpecies (target, actor) {
    let species = await actor.items.filter(i => i.type === 'species')
    if (species.length < 1) { return }
    await species[0].delete()
    let changes = {}
    for (let [key, ability] of Object.entries(actor.system.abilities)) {
      let formula = '3D6'
      let min = 3
      let max = 21
      if (['int', 'siz'].includes(key)) {
        formula = '2D6+6'
        min = 8
      }
      changes = Object.assign(changes, {
        [`system.abilities.${key}.formula`]: formula,
        [`system.abilities.${key}.min`]: min,
        [`system.abilities.${key}.max`]: max
      })
    }
    await actor.update(changes)
  }

  //Reset Homeland
  /**
   *
   * @param target
   * @param actor
   */
  static async resetHomeland (target, actor) {
    let home = await actor.items.filter(i => i.type === 'homeland')
    if (home.length < 1) { return }
    await home[0].delete()
    let updateItems = []
    for (let itm of actor.items) {
      if (['passion', 'skill'].includes(itm.type)) {
        updateItems.push({ _id: itm._id, 'system.home': 0 })
      } else if (itm.system.source === 'home') {

      }
    }
    await Item.updateDocuments(updateItems, { parent: actor })
    let deleteItems = await actor.items.filter(i => i.system.source === 'home').map(itm => { return (itm.id) })
    await Item.deleteDocuments(deleteItems, { parent: actor })
  }


  //Roll Character Dice - Random
  /**
   *
   * @param actor
   */
  static async rollRandom (actor) {
    const abilities = {}
    const results = []
    const rolls = []
    for (const [key, value] of Object.entries(actor.system.abilities)) {
      if (value.formula && !value.formula.startsWith('@')) {
        const roll = new Roll(value.formula)
        await roll.evaluate()
        if (roll.total) {
          abilities[`system.abilities.${key}.value`] = Math.floor(
            roll.total
          )
        }
        let diceRolled = ''
        for (let diceRoll = 0; diceRoll < roll.dice.length; diceRoll++) {
          for (let thisDice = 0; thisDice < roll.dice[diceRoll].values.length; thisDice++) {
            if (thisDice != 0 || diceRoll != 0) {
              diceRolled = diceRolled + ', '
            }
            diceRolled = diceRolled + roll.dice[diceRoll].values[thisDice]
          }
        }
        results.push({ label: value.label, formula: value.formula, value: roll.total, dice: diceRolled })
        if(game.settings.get('aov', 'showDiceRolls')) {
          rolls.push(roll)
        }
      }
    }
    let msgData = {
      particName: actor.name,
      particImg: actor.img,
      results: results
    }
    let html = await foundry.applications.handlebars.renderTemplate('systems/aov/templates/chat/random-dice.hbs', msgData)
    let msg = await AOVCharCreate.showStats(html, rolls, game.i18n.localize('AOV.rollRandom'), actor._id)

    if (msg) {
      await actor.update(abilities)
      await actor.update({
        'system.mp.value': actor.system.mp.max - (actor.system.lockedMP ?? 0)
      })
      ui.notifications.warn(game.i18n.localize('AOV.diceRolled'))
    }
    return
  }

  //Roll Character Dice - Assign
  /**
   *
   * @param actor
   */
  static async assignRandom (actor) {
    const abilities = {}
    const rolls = []
    const dice = []
    //Get the dice that need rolling and adjustments
    for (const [key, value] of Object.entries(actor.system.abilities)) {
      if (value.formula && !value.formula.startsWith('@')) {
        const roll = new Roll(value.formula)
        value.numDic = value.formula.split('D6')[0]
        value.adjVal = Number(value.formula.split('D6')[1] ?? 0)
        await roll.evaluate()
        let diceRolled = ''
        for (let diceRoll = 0; diceRoll < roll.dice.length; diceRoll++) {
          for (let thisDice = 0; thisDice < roll.dice[diceRoll].values.length; thisDice++) {
            dice.push({ value: roll.dice[diceRoll].values[thisDice], pick: 'none', picked: 0 })
          }
        }
        if(game.settings.get('aov', 'showDiceRolls')) {
          rolls.push(roll)
        }
      }
    }
    //Sort the dice rolled numerically
    dice.sort(function (a, b) {
      let x = a.value
      let y = b.value
      if (x < y) { return 1 };
      if (x > y) { return -1 };
      return 0
    })
    //Put the dice results to a chat card (which in turn kicks off dice so nice)
    let results = actor.system.abilities
    let msgData = {
      particName: actor.name,
      particImg: actor.img,
      dice,
      results
    }
    let html = await foundry.applications.handlebars.renderTemplate('systems/aov/templates/chat/assign-dice.hbs', msgData)
    let msg = await AOVCharCreate.showStats(html, rolls, game.i18n.localize('AOV.assignRoll'), actor._id)
    //Pass the dice and stats to a dialog to assign dice to stats
    let selectedStats = await AssignDiceDialog.create(dice, dice.length, results)
    if (selectedStats) {
      for (const [key, value] of Object.entries(actor.system.abilities)) {
        let tempStat = value.adjVal

        for (let stat of selectedStats) {
          if (stat.pick === key) {
            tempStat = tempStat + stat.value
          }
        }
        abilities[`system.abilities.${key}.value`] = tempStat
      }
      await actor.update(abilities)
      await actor.update({
        'system.mp.value': actor.system.mp.max - (actor.system.lockedMP ?? 0)
      })
      ui.notifications.warn(game.i18n.localize('AOV.diceAllocated'))
    }
    return
  }

  //Assign Stats using Points
  /**
   *
   * @param actor
   */
  static async usePoints (actor) {
    const abilities = {}
    let selectedStats = await StatsSelectDialog.create(actor.system.abilities)
    if (!selectedStats) { return }
    for (const [key, stat] of Object.entries(selectedStats[0])) {
      abilities[`system.abilities.${key}.value`] = stat.value
    }
    await actor.update(abilities)
    await actor.update({
      'system.mp.value': actor.system.mp.max - (actor.system.lockedMP ?? 0)
    })
    ui.notifications.warn(game.i18n.localize('AOV.pointsAllocated'))
  }

  //Roll Personality
  /**
   *
   * @param actor
   */
  static async rollPersonality (actor) {
    let table = (await game.aov.cid.fromCIDBest({ cid: 'rt..spirit-animal' }))[0]
    if (!table) {
      ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.noTable', { tableCID: 'rt..spirit-animal' }))
      return
    }
    const tableResults = await COCard.tableDiceRoll(table)
    let personality = AOVUtilities.toKebabCase(tableResults.results[0].name)
    await actor.update({ 'system.persType': personality })
    ui.notifications.warn(game.i18n.localize('AOV.personalityRolled'))
    return
  }


  //Select Personal Skills
  /**
   *
   * @param actor
   */
  static async persSkills (actor) {

    let mythic = false
    if (actor.system.persType === 'spiritual') { mythic = true }
    let homeland = actor.items.get(actor.system.homeID)
    if (homeland) {
      if (homeland.system.mythic) { mythic = true }
    }
    //Get the list of available skills for improvement

    //Reset personal skill points to zero
    let oldList = await actor.items.filter(h => h.type === 'skill').filter(i => i.system.pers > 0).map(itm => { return { _id: itm._id, 'system.pers': 0 } })
    await Item.updateDocuments(oldList, { parent: actor })

    for (let loop=1; loop<3; loop++) {
      let skillList = []
      let picks = 4 + loop
      let bonus = 25
      if (loop>1) bonus = 10

      if (mythic) {
        skillList = await actor.items.filter(h => h.type === 'skill').filter(i => i.system.total < 100 && i.system.pers === 0).map(itm => { return { id: itm._id, name: itm.system.label +'('+itm.system.total+')', score: itm.system.total, bonus: 0 } })
      } else {
        skillList = await actor.items.filter(h => h.type === 'skill').filter(i => i.system.total < 100 && i.system.pers === 0).filter(m => m.system.category != 'myt').map(itm => { return { id: itm._id, name: itm.system.label +'('+itm.system.total+')', score: itm.system.total, bonus: 0 } })
      }
      skillList = skillList.sort(function (a, b) { return a.name.localeCompare(b.name) })
      skillList.unshift({ id: 'xxx', name: game.i18n.format('AOV.selectItem', { type: game.i18n.localize('TYPES.Item.skill') }), score: -1000, bonus: 0 })

      //Make the selections
      //let personalSkills = await PersSkillSelectDialog.create(skillList)
      let personalSkills = await SkillsSelectDialog.create(skillList, picks, game.i18n.format('AOV.selectItem', { type: game.i18n.localize('TYPES.Item.skill') }),  game.i18n.format('AOV.personalSkillPicks', { bonus: bonus }))
      if (personalSkills) {
        let updateItems = []
        for (let itm of personalSkills) {
          let thisBonus = bonus
          if (itm.score + bonus > 100) {
            thisBonus = 100 - itm.score
          }
          updateItems.push({ _id: itm.id, 'system.pers': thisBonus })
        }
        await Item.updateDocuments(updateItems, { parent: actor })
      }
    }
    ui.notifications.warn(game.i18n.localize('AOV.persSkillsSelected'))
    return
  }


  //Select devotions
  /**
   *
   * @param actor
   */
  static async devotions (actor) {
    //Prepare List of Devotions
    let devotionList = await AOVSelectLists.preLoadCategoriesCategories()
    devotionList = devotionList.filter(itm => itm.type === 'devotion').map(itm => { return { id: itm._id, name: itm.name+'('+itm.system.ideals+')', score: 0, cid: itm.flags.aov?.cidFlag?.id, skillCid: itm.system.skills[0].cid } })
    devotionList = devotionList.sort(function (a, b) { return a.name.localeCompare(b.name) })
    devotionList.unshift({ id: 'xxx', name: game.i18n.format('AOV.selectItem', { type: game.i18n.localize('TYPES.Item.devotion') }), score: 0 })

    let devotionsChosen = await DevotionSelectDialog.create(devotionList)

    if (devotionsChosen) {
      let updateItems = []
      let newItems = []
      let updateDevs = []
      let resetSkills = []

      for (let counter = 1; counter <= 3; counter++) {
        let devID = devotionsChosen['option' + counter].value
        let devScore = devotionsChosen['option' + counter].dataset.adj

        //Get devotion
        let devotion = await devotionList.filter(itm => itm.id === devID)[0]

        // Match devotion to items on actor
        let existDev = await actor.items.filter(itm => itm.flags.aov?.cidFlag?.id === devotion.cid)

        //Create existing devotion as needed
        if (existDev.length < 1) {
          let newDev = await game.aov.cid.fromCID(devotion.cid)
          if (newDev.length > 0) {
            let xItm = newDev[0].toObject()
            newItems.push(xItm)
          }
        }

        //Now check for the related worship skill
        let existSkill = await actor.items.filter(itm => itm.flags.aov?.cidFlag?.id === devotion.skillCid)
        if (existSkill.length > 0) {
          updateItems.push({ _id: existSkill[0]._id, 'system.dev': devScore })
        } else {
          let newSkill = await game.aov.cid.fromCID(devotion.skillCid)
          if (newSkill.length > 0) {
            let xItm = newSkill[0].toObject()
            xItm.system.dev = devScore
            newItems.push(xItm)
          }
        }
      }

      //Reset any skill devotion score to zero
      for (let itm of actor.items) {
        if (['skill'].includes(itm.type)) {
          resetSkills.push({ _id: itm._id, 'system.dev': 0 })
        }
      }
      await Item.updateDocuments(resetSkills, { parent: actor })
      await Item.updateDocuments(updateItems, { parent: actor })
      await Item.createDocuments(newItems, { parent: actor })

      //Now review devotions and worship skills to set dp
      let currDev = await actor.items.filter(itm => itm.type === 'devotion')
      if (currDev) {
        for (let dev of currDev) {
          let worship = actor.items.filter(itm => itm.flags.aov?.cidFlag?.id === dev.system.skills[0].cid)
          if (worship.length > 0) {
            let score = worship[0].system.total
            let dp = 0
            if (score >= 60) {
              dp = 3
            } else if (score >= 30) {
              dp = 2
            } else if (score >= 10) {
              dp = 1
            }
            updateDevs.push({ _id: dev._id, 'system.dp': dp })
          }
        }
        await Item.updateDocuments(updateDevs, { parent: actor })
      }
      ui.notifications.warn(game.i18n.localize('AOV.devsSelected'))
    }
    return
  }


  //Create Family
  /**
   *
   * @param actor
   */
  static async family (actor) {
    //Adjust Age for an older/younger character
    let ageAdj = Math.max(actor.system.age - 22, 0)
    let family = []

    //Define template for a new family member
    const docCls = getDocumentClass('Item')
    const docData = {
      name: docCls.defaultName({
        type: 'family',
        parent: actor
      }),
      type: 'family'
    }

    //Check Table and roll on it
    let table = (await game.aov.cid.fromCIDBest({ cid: 'rt..marital-status' }))[0]
    if (!table) {
      ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.noTable', { tableCID: 'rt..marital-status' }))
      return
    }
    const tableResults = await COCard.tableDiceRoll(table)
    let mainRoll = tableResults.roll.total
    let familyResult = (tableResults.results[0].description).replace(/(<([^>]+)>)/ig, '')
    let familyName = tableResults.results[0].name
    let spouses = Number((familyResult.split(',')[0]).split(':')[1])
    let children = Number((familyResult.split(',')[1]).split(':')[1])
    let age = ((familyResult.split(',')[2]).split(':')[1]).trim()
    let newItems = []
    //Get current Family - delete later
    let spouseLabel = game.i18n.localize('AOV.spouse')
    let childLabel = game.i18n.localize('AOV.child')
    let currFamily = await actor.items.filter(i => i.type === 'family').filter(f => [spouseLabel, childLabel].includes(f.system.relation)).map(itm => { return (itm.id) })

    //Roll Spouse
    if (spouses > 0) {
      for (let count = 1; count <= spouses; count++) {
        let gender = ''
        let genderLabel = ''
        if (game.settings.get('aov', 'binaryGender')) {
          if (actor.system.gender === 'male') {
            gender = 'female'
          } else {
            gender = 'male'
          }
          genderLabel = game.i18n.localize('AOV.' + gender)
        } else {
          gender = await AOVCharCreate.askGender()
          gender = game.i18n.localize('AOV.' + gender)
          genderLabel = gender
        }

        docData.name = (await (AOVCharCreate.rollName(gender))).newName

        const newItem = await docCls.create(docData, { parent: actor })
        let key = await game.aov.cid.guessId(newItem)
        await newItem.update({
          'flags.aov.cidFlag.id': key,
          'flags.aov.cidFlag.lang': game.i18n.lang,
          'flags.aov.cidFlag.priority': 0,
          'system.born': actor.system.birthYear,
          'system.relation': spouseLabel,
          'system.relationship': 'spouse',
          'system.gender': gender
        })
        family.push({ name: newItem.name, relation: spouseLabel, gender: genderLabel, age: actor.system.age })
      }
    }

    //Roll Children
    if (children > 0) {
      for (let count = 1; count <= children; count++) {
        let gender = ''
        let genderLabel = ''
        if (!Roll.validate(age)) {
          age = '1D6'
        }
        let ageRoll = new Roll(age)
        await ageRoll.evaluate()
        await AOVCharDevelop.showDiceRoll(ageRoll)
        let currAge = ageRoll.total
        if (currAge % 2 == 0) {
          gender = 'male'
        } else {
          gender = 'female'
        }
        if (game.settings.get('aov', 'binaryGender')) {
          genderLabel = game.i18n.localize('AOV.' + gender)
        } else {
          gender = game.i18n.localize('AOV.' + gender)
          genderLabel = gender
        }
        currAge = currAge + ageAdj
        let born = game.settings.get('aov', 'gameYear') - currAge
        let patrionic = ((actor.name).split(' ')[0]).trim()
        docData.name = (await (AOVCharCreate.rollName(gender, patrionic))).newName
        const newItem = await docCls.create(docData, { parent: actor })
        let key = await game.aov.cid.guessId(newItem)
        await newItem.update({
          'flags.aov.cidFlag.id': key,
          'flags.aov.cidFlag.lang': game.i18n.lang,
          'flags.aov.cidFlag.priority': 0,
          'system.born': born,
          'system.relation': 'childLabel',
          'system.relationship': 'child',
          'system.gender': gender
        })
        family.push({ name: newItem.name, relation: childLabel, gender: genderLabel, age: currAge })
      }
    }
    let msgData = {
      particName: actor.name,
      particImg: actor.img,
      family: family,
      noFamily: family.length === 0,
      mainRoll: mainRoll
    }

    //Delete any pre-existing children and spouses
    await Item.deleteDocuments(currFamily, { parent: actor })

    //Create Chat Message
    let rolls = {}
    let html = await foundry.applications.handlebars.renderTemplate('systems/aov/templates/chat/create-family.hbs', msgData)
    let msg = await AOVCharCreate.showStats(html, rolls, game.i18n.localize('AOV.familyCreated'), actor._id)
    ui.notifications.warn(game.i18n.localize('AOV.familyCreated'))
    return
  }


  //Create a new farm from the Roll Table
  /**
   *
   * @param actor
   */
  static async farm (actor) {
    let owners = actor.ownership

    //Check Table and roll on it
    let table = (await game.aov.cid.fromCIDBest({ cid: 'rt..farm-activity' }))[0]
    if (!table) {
      ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.noTable', { tableCID: 'rt..farm-activity' }))
      return
    }
    const tableResults = await COCard.tableDiceRoll(table)
    let mainRoll = tableResults.roll.total
    let farmResult = await tableResults.results.filter(i => i.type === 'document')[0]
    if (!farmResult) {
      ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.invalidStructure', { tableCID: 'rt..farm-activity' }))
      return
    }
    let farmDesc = farmResult.name
    let farmUuid = farmResult.documentUuid
    if (!farmUuid) { return }
    let farm = await fromUuid(farmUuid)
    let farmName = game.i18n.format('AOV.farmOwner', { person: actor.name.split(' ')[0] })
    let newFarm = await Actor.implementation.create({
      name: farmName,
      type: 'farm',
      ownership: owners,
      img: 'systems/aov/art-assets/grain-bundle.svg',
      system: {
        farmType: farm.system.farmType,
        sheep: farm.system.sheep,
        cattle: farm.system.cattle,
        horses: farm.system.horses,
        value: farm.system.value
      }
    })


    let thrallRoll = new Roll('1D3')
    await thrallRoll.evaluate()
    await AOVCharDevelop.showDiceRoll(thrallRoll)
    let thrallCount = thrallRoll.total
    let thrallFlag = true
    //Check if we add Thralls or Sheep
    if (game.settings.get('aov', 'addThralls')) {
      for (let counter = 1; counter <= thrallCount; counter++) {
        let genderRoll = new Roll('1D2')
        await genderRoll.evaluate()
        await AOVCharDevelop.showDiceRoll(genderRoll)
        let gender = 'male'
        if (genderRoll.total === 2) {
          gender = 'female'
        }
        if (!game.settings.get('aov', 'binaryGender')) {
          gender = game.i18n.localize('AOV.' + gender)
        }
        let ageRoll = new Roll('2D6')
        await ageRoll.evaluate()
        await AOVCharDevelop.showDiceRoll(ageRoll)
        let born = game.settings.get('aov', 'gameYear') - (16 + ageRoll.total)

        const docCls = getDocumentClass('Item')
        const docData = {
          name: docCls.defaultName({
            type: 'thrall',
            parent: newFarm
          }),
          type: 'thrall',
          system: {
            born: born,
            gender: gender
          }
        }
        const newThrall = await docCls.create(docData, { parent: newFarm })
      }


    } else {
      await newFarm.update({
        'system.sheep': newFarm.system.sheep + thrallCount
      })
      thrallFlag = false
    }

    //Add farm to actor
    const farms = []
    farms.push({ uuid: newFarm.uuid })
    await actor.update({ 'system.farms': farms })

    let msgData = {
      particName: actor.name,
      particImg: actor.img,
      farmDesc: farmDesc,
      mainRoll: mainRoll,
      thrallCount: thrallCount,
      thrallFlag: thrallFlag
    }

    //Create Chat Message
    let rolls = {}
    let html = await foundry.applications.handlebars.renderTemplate('systems/aov/templates/chat/create-farm.hbs', msgData)
    let msg = await AOVCharCreate.showStats(html, rolls, game.i18n.localize('AOV.farmCreated'), actor._id)
    ui.notifications.warn(game.i18n.localize('AOV.farmCreated'))
    return

  }


  /**
   *
   * @param actor
   */
  static async selectWeapons (actor) {
    let currentWpns = await actor.items.filter(itm => itm.system.source === 'weapons').map(itm => { return (itm.id) })
    let weaponList = await AOVSelectLists.preLoadCategoriesCategories()
    weaponList = weaponList.filter(itm => itm.type === 'weapon').filter(itm => itm.system.weaponType != 'naturalWpn').filter(itm => itm.system.common).map(itm => { return { id: itm._id, name: itm.name, cid: itm.flags.aov?.cidFlag?.id, skillCid: itm.system.skillCID, score: 0 } })
    weaponList = weaponList.sort(function (a, b) {return a.name.localeCompare(b.name)})
    weaponList.unshift({ id: 'xxx', name: game.i18n.format('AOV.selectItem', { type: game.i18n.localize('TYPES.Item.weapon') }), score: 0 })
    let weaponsChosen = await WeaponSelectDialog.create(weaponList)

    if (weaponsChosen) {
      let updateItems = []
      let newItems = []
      let updateDevs = []
      let resetSkills = []

      for (let counter = 1; counter <= 2; counter++) {
        let weaponID = weaponsChosen['option' + counter].value

        //Get weapon
        let weapon = await weaponList.filter(itm => itm.id === weaponID)[0]

        //Create weapon
        let newWpn = await game.aov.cid.fromCID(weapon.cid)
        if (newWpn.length > 0) {
          let xItm = newWpn[0].toObject()
          xItm.system.source = 'weapons'
          newItems.push(xItm)
        }

        //Now check for the related worship skill
        let existSkill = await actor.items.filter(itm => itm.flags.aov?.cidFlag?.id === weapon.skillCid)
        let existNewItems = await newItems.filter(itm => itm.flags.aov?.cidFlag?.id === weapon.skillCid)
        let already = existSkill.length + existNewItems.length

        if (already < 1) {
          let newSkill = await game.aov.cid.fromCID(weapon.skillCid)
          if (newSkill.length > 0) {
            let xItm = newSkill[0].toObject()
            newItems.push(xItm)
          }
        }
      }
      await Item.createDocuments(newItems, { parent: actor })
      //Delete any pre-existing children and spouses
      await Item.deleteDocuments(currentWpns, { parent: actor })
      ui.notifications.warn(game.i18n.localize('AOV.weaponsSelected'))
    }
  }

  /**
   *
   * @param actor
   */
  static async features (actor) {

    let rollResult = ''
    //Check Table and roll on it
    let table = (await game.aov.cid.fromCIDBest({ cid: 'rt..distinctive-features' }))[0]
    if (!table) {
      ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.noTable', { tableCID: 'rt..distinctive-features' }))
      return
    }
    let features = ''
    for (let counter = 1; counter <= 3; counter++) {
      const tableResults = await COCard.tableDiceRoll(table)
      let result = await tableResults.results.filter(i => i.type === 'text')[0]
      if (!result) {
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.invalidStructure', { tableCID: 'rt..distinctive-features' }))
        return
      }
      features = features + result.name
      rollResult = rollResult + tableResults.roll.total
      if (counter < 3) {
        features = features + ', '
        rollResult = rollResult + ', '
      }
    }

    if (features.length > 0) {
      await actor.update({ 'system.distFeatures': features })
      let rolls={}
      let msgData = {
        particName: actor.name,
        particImg: actor.img,
        features: features,
        rollResult: rollResult
      }

      //Create Chat Message

      let html = await foundry.applications.handlebars.renderTemplate('systems/aov/templates/chat/create-features.hbs', msgData)
      let msg = await AOVCharCreate.showStats(html, rolls, game.i18n.localize('AOV.distFeatures'), actor._id)

      ui.notifications.warn(game.i18n.localize('AOV.featuresSelected'))
    }
  }

  /**
   *
   * @param actor
   */
  static async history (actor) {
    let homeland = await actor.items.get(actor.system.homeID)
    let newItems = []
    if (!homeland) {
      ui.notifications.warn(game.i18n.localize('AOV.ErrorMsg.noHomeland'))
      return
    }

    //Reset History
    await AOVCharCreate.resetHistory(actor)

    const collection = homeland.system.historyToday ? foundry.utils.duplicate(homeland.system.historyToday) : []
    //Sort History by CID (i.e. in to year order)
    collection.sort(function (a, b) {
      let x = a.cid
      let y = b.cid
      if (x < y) { return -1 };
      if (x > y) { return 1 };
      return 0
    })

    let results = []
    for (let history of collection) {
      let target = history.historyType
      //Check that the target is alive
      if (target === 'grandparent' && actor.system.grandparents) {
        continue
      } else if (target === 'parent' && actor.system.parents) {
        continue
      }

      //Check Table and roll on it
      let table = (await game.aov.cid.fromCIDBest({ cid: history.cid }))[0]
      if (!table) {
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.noTable', { tableCID: history.cid }))
        continue
      }

      const tableResults = await COCard.tableDiceRoll(table)
      let mainRoll = tableResults.roll.total
      let historyResult = await tableResults.results.filter(i => i.type === 'document')[0]
      if (!historyResult) {
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.invalidStructure', { tableCID: history.cid }))
        continue
      }
      let historyDoc = await fromUuid(historyResult.documentUuid)
      let added = await AOVActorItemDrop._dropHistory(historyDoc, actor)
      if (added) {
        let xItm = historyDoc.toObject()
        xItm.system.source = 'history'
        newItems.push(xItm)
        results.push({ itemName: xItm.name, rollVal: mainRoll, year: xItm.system.year })
        //If result means ancestor died update the character
        if (historyDoc.system.dies) {
          if (target === 'grandparent' && !actor.system.grandparents) {
            await actor.update({ 'system.grandparents': true })
          } else if (target === 'parent' && !actor.system.parents) {
            await actor.update({ 'system.parents': true })
          }
        }
      }

      //Check for follow on roll-tables
      for (let followUp of historyDoc.system.historyToday) {
        table = (await game.aov.cid.fromCIDBest({ cid: followUp.cid }))[0]
        if (!table) {
          ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.noTable', { tableCID: followUp.cid }))
          continue
        }
        const tableResults = await COCard.tableDiceRoll(table)
        let secRoll = tableResults.roll.total
        historyResult = await tableResults.results.filter(i => i.type === 'document')[0]
        if (!historyResult) {
          ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.invalidStructure', { tableCID: followUp.cid }))
          continue
        }
        let sechistoryDoc = await fromUuid(historyResult.documentUuid)
        added = await AOVActorItemDrop._dropHistory(sechistoryDoc, actor)
        if (added) {
          let xItm = sechistoryDoc.toObject()
          xItm.system.source = 'history'
          newItems.push(xItm)
          results.push({ itemName: xItm.name, rollVal: secRoll, year: xItm.system.year })
          //If result means ancestor died update the character
          if (sechistoryDoc.system.dies) {
            if (target === 'grandparent' && !actor.system.grandparents) {
              await actor.update({ 'system.grandparents': true })
            } else if (target === 'parent' && !actor.system.parents) {
              await actor.update({ 'system.parents': true })
            }
          }
        }
      }
    }
    await Item.createDocuments(newItems, { parent: actor })

    //Create Chat Message
    let msgData = {
      particName: actor.name,
      particImg: actor.img,
      results: results
    }
    let rolls = {}
    let html = await foundry.applications.handlebars.renderTemplate('systems/aov/templates/chat/character-history.hbs', msgData)
    let msg = await AOVCharCreate.showStats(html, rolls, game.i18n.localize('AOV.familyHistory'), actor._id)
  }

  //Show Roll Message
  /**
   *
   * @param html
   * @param rolls
   * @param alias
   * @param actorID
   */
  static async showStats (html, rolls, alias, actorID) {
    let chatData = {}
    chatData = {
      user: game.user.id,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      rolls: rolls,
      content: html,
      speaker: {
        actor: actorID,
        alias: alias
      }
    }
    let msg = await ChatMessage.create(chatData)
    return msg
  }

  //Get gender
  /**
   *
   */
  static async askGender () {
    const gender = await AOVDialog.wait({
      window: { title: game.i18n.localize('AOV.gender') },
      content: game.i18n.localize('AOV.askGender'),
      buttons: [
        {
          label: game.i18n.localize('AOV.male'),
          action: 'male'
        },
        {
          label: game.i18n.localize('AOV.male'),
          action: 'female'
        }
      ]
    })

    return gender
  }

  //Get value input
  /**
   *
   * @param title
   */
  static async inpValue (title) {
    let inpVal = await AOVDialog.input({
      window: { title: title },
      content: '<input class="centre" type="number" name="inpvalue">'
    })
    return inpVal
  }

  //Get text input
  /**
   *
   * @param title
   */
  static async inpText (title) {
    let inpVal = await AOVDialog.input({
      window: { title: title },
      content: '<input class="centre" type="text" name="inpvalue">'
    })
    return inpVal
  }

  //Get history type
  /**
   *
   */
  static async askHistory () {
    const person = await AOVDialog.wait({
      window: { title: game.i18n.localize('TYPES.Item.history') },
      content: game.i18n.localize('AOV.askHistory'),
      buttons: [
        {
          label: game.i18n.localize('AOV.grandparent'),
          action: 'grandparent'
        },
        {
          label: game.i18n.localize('AOV.parent'),
          action: 'parent'
        },
        {
          label: game.i18n.localize('TYPES.Actor.character'),
          action: 'character'
        }
      ]
    })
    return person
  }


  //Reset Actor History
  /**
   *
   * @param actor
   */
  static async resetHistory (actor) {
    let resetSkills = []
    //Reset any skill or passion history scores to zero
    for (let itm of actor.items) {
      if (['skill', 'passion'].includes(itm.type)) {
        resetSkills.push({ _id: itm._id, 'system.history': 0 })
      }
    }
    await Item.updateDocuments(resetSkills, { parent: actor })
    //Reset grandparent and parent lives & reputation history score
    await actor.update({
      'system.grandparents': false,
      'system.parents': false,
      'system.reputation.history': 0
    })
    //Add items with a history source to the "delete items" list
    let histItems = await actor.items.filter(itm => itm.system.source === 'history').map(itm => { return (itm.id) })
    await Item.deleteDocuments(histItems, { parent: actor })
  }

}
