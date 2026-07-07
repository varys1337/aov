import { CID } from '../cid/cid.mjs'
import { AOVSelectLists } from '../apps/select-lists.mjs'
import { AOVActorItemDrop } from './actor-item-drop.mjs'

export class AOVActor extends Actor {

  /**
   *
   */
  prepareData () {
    super.prepareData()
  }

  /**
   *
   */
  prepareBaseData () {
    super.prepareBaseData()
    this.system.cidFlagItems = {}
    for (const i of this.items) {
      if (i.flags.aov?.cidFlag?.id) {
        const parts = i.flags.aov?.cidFlag?.id.match(/^([^\.]+)\.([^\.]+)\.([^\.]+)$/)
        if (parts) {
          if (typeof this.system.cidFlagItems[parts[1]] === 'undefined') {
            this.system.cidFlagItems[parts[1]] = {}
          }
          if (typeof this.system.cidFlagItems[parts[1]][parts[2]] === 'undefined') {
            this.system.cidFlagItems[parts[1]][parts[2]] = {}
          }
          this.system.cidFlagItems[parts[1]][parts[2]][parts[3]] = i
        }
      }
    }
  }

  /**
   *
   */
  prepareDerivedData () {
    const actorData = this
    const systemData = actorData.system
    const flags = actorData.flags.aov || {}

    systemData.mqPenalty = 0
    systemData.encPenalty = 0

    //Prepare data for different actor types
    this._prepareCharacterData(actorData)
    this._prepareNPCData(actorData)
  }

  //Prepare Character specific data
  /**
   *
   * @param actorData
   */
  _prepareCharacterData (actorData) {
    if (actorData.type !== 'character') return
    const systemData = actorData.system
    systemData.speciesID = ''
    systemData.homeID = ''
    systemData.actualEnc = 0
    systemData.encPenaltyLabel = '0 ' + game.i18n.localize('AOV.mrAbbr') +'/0%'
    systemData.lockedMP = 0
    let totDam = 0
    let birthYr = game.settings.get('aov', 'gameYear')-10
    let familyList = actorData.items.filter(itm => itm.type === 'family').filter(dItm => dItm.system.depend).filter(fItm => !fItm.system.died)
    let children = familyList.filter(itm => itm.system.born > birthYr).length
    systemData.dependents = familyList.length - children + Math.floor(children/2)
    this._prepStats(actorData)
    this._prepDerivedStats(actorData)

    //Set Species ID
    let actSpecies = actorData.items.filter(itm => itm.type==='species')[0]
    if (actSpecies) {
      systemData.speciesID = actSpecies._id
      systemData.speciesName = actSpecies.name
    }
    //Set Homeland ID
    let actHome = actorData.items.filter(itm => itm.type==='homeland')[0]
    if (actHome) {
      systemData.homeID = actHome._id
      systemData.homeName = actHome.name
    }



    for (let itm of actorData.items) {
      //Does the item have transferrable effects
      if (['gear', 'armour', 'weapon', 'hitloc'].includes(itm.type)) {
        if (itm.transferredEffects.length > 0) {
          itm.system.hasEffects = true
        } else {
          itm.system.hasEffects = false
        }
      }

      if (itm.type === 'skill') {
        //Calculate Total Chance
        itm.system.total = (itm.system.base ?? 0) + (itm.system.xp ?? 0) + (itm.system.home ?? 0) + Number(itm.system.history ?? 0) + (itm.system.pers ?? 0) + (itm.system.dev ?? 0) + (itm.system.effects ?? 0)
        itm.system.catBonus = actorData.system[itm.system.category] ?? 0
        itm.system.catLabel = game.i18n.localize('AOV.skillCat.' + itm.system.category)
        if (itm.system.total > 0) {
          itm.system.total += itm.system.catBonus
        }
        //Item label combining specialism - consider removing this and replacing all places of system.label for skills
        itm.system.label = itm.name
        //Build up Weapon Category Max Values
        if (itm.system.category === 'cbt') {
          let catName = itm.system.weaponCat
          if (catName) {
            catName = catName.split('.')[2]
            if (!systemData.weaponCats[catName]) {
              systemData.weaponCats[catName] = itm.system.total
            } else if (itm.system.total > systemData.weaponCats[catName]) {
              systemData.weaponCats[catName] = itm.system.total
            }
          }
        }

      } else if (itm.type === 'passion') {
        itm.system.total = Number(itm.system.base ?? 0) + Number(itm.system.home ?? 0) + Number(itm.system.history ?? 0) + Number(itm.system.family ?? 0) + Number(itm.system.xp ?? 0) + Number(itm.system.effects ?? 0)
      } else if (itm.type === 'wound') {
        let loc = actorData.items.get(itm.system.hitLocId)
        if (loc) {itm.system.label = loc.name ?? ''}
        totDam = totDam + itm.system.damage
      } else if (['gear', 'weapon', 'armour'].includes(itm.type)) {
        if (itm.system.equipStatus === 1 ) {
          itm.system.actlEnc = itm.system.enc * (itm.system.quantity ?? 1)
          //Calc Move Quietly Penalty for Armour
          if (itm.type==='armour') {
            if (itm.system.mqPenalty < systemData.mqPenalty) {
              systemData.mqPenalty = itm.system.mqPenalty
            }
          }
        } else {
          itm.system.actlEnc = 0
        }
        systemData.actualEnc += (itm.system.actlEnc ?? 0)
      } else if (itm.type === 'runescript') {
        let runedetails = AOVActor.runeMPCost (itm)
        itm.system.mpCost = runedetails.cost
        itm.system.maxEff = runedetails.maxEff
        itm.system.effective = runedetails.effective
        if (itm.system.prepared) {
          systemData.lockedMP = systemData.lockedMP + itm.system.mpCost
        }
      } else if (itm.type === 'seidur') {
        let seidurdetails = AOVActor.seidurMPCost(itm)
        if (itm.system.prepared) {
          systemData.lockedMP = systemData.lockedMP + seidurdetails.mpLocked
        }
      }
    }
    systemData.actualEnc = Math.floor(systemData.actualEnc)
    systemData.mp.availMax = systemData.mp.max - systemData.lockedMP
    systemData.hp.value = systemData.hp.max - totDam



    //Go through items a second time to calculate a second round of values
    let armourList = actorData.items.filter(i => i.type === 'armour').filter(j => j.system.equipStatus === 1)
    let totalDmg = 0
    for (let itm of actorData.items) {
      //Go through Hit Locations and calc AP, Max HP, and current HP
      if (itm.type === 'hitloc') {
        //Calc C(urrent) and M(ax) AP
        itm.system.map = 0 + actorData.system.apBonus + itm.system.apMod
        if (armourList.length>0){
          for (let aItm of armourList){
            if (itm.system.lowRoll>=aItm.system.lowLoc && itm.system.highRoll<=aItm.system.highLoc) {
              itm.system.map += aItm.system.map
            }
          }
        }

        //Check Armour Override Active Effect
        itm.system.map = Math.max(itm.system.map, actorData.system.apBestow)

        //Calc Max HP
        let totalWnds = 0
        if (itm.system.locType ===  'general') {
          itm.system.hpMax = 0
        } else {
          itm.system.hpMax = Math.max(Math.ceil(systemData.hp.max / 3), 2) + (itm.system.hpMod ?? 0)
        }
        //Calc Wounds and therefore current HP
        for (let witm of actorData.items) {
          if (witm.type === 'wound') {
            if (witm.system.hitLocId === itm.id) {
              totalWnds += witm.system.damage
            }
          }
        }
        itm.system.currHp = itm.system.hpMax - totalWnds
      }
      //Go through Weapons and calc best score from weapon skill and half the category score
      if (itm.type === 'weapon'){
        let weaponSkill = actorData.items.filter(i => i.flags.aov?.cidFlag?.id === itm.system.skillCID)
        let weaponScore = 0
        if (weaponSkill.length > 0) {
          weaponScore = weaponSkill[0].system.total
        }
        let catName = itm.system.weaponCat
        if (catName) {
          catName = catName.split('.')[2]
        }
        let catScore = actorData.system.weaponCats[catName] ?? 0
        itm.system.total = Math.max(weaponScore, Math.ceil(catScore/2))
      }

      if (itm.type === 'devotion') {
        itm.system.dpMax = 0
        if (itm.system.skills.length>0) {
          let worshipSkill = actorData.items.filter(i => i.flags.aov?.cidFlag?.id === itm.system.skills[0].cid)
          if(worshipSkill) {
            let worshipSkillVal = worshipSkill[0].system.total
            if (worshipSkillVal >= 60) {
              itm.system.dpMax = 3
            } else if (worshipSkillVal >= 30) {
              itm.system.dpMax = 2
            } else if (worshipSkillVal >= 10) {
              itm.system.dpMax = 1
            }
          }
        }
      }
    }

    //Calculate ENC penalites
    this._eNCPenalty (actorData)

    //Check to see if Actor is in a visible party and if so re-render the party sheet, function is asynchronous but does not alter actorData
    this._updateParty(actorData)
  }

  //Prepare NPC specific data
  /**
   *
   * @param actorData
   */
  _prepareNPCData (actorData) {
    if (actorData.type !== 'npc') return
    const systemData = actorData.system
    systemData.actualEnc = 0
    this._prepStats(actorData)
    this._prepDerivedStats(actorData)

    let totalDmg = 0
    for (let itm of actorData.items) {
      //Go through Hit Locations and calc AP, Max HP, and current HP
      if (itm.type === 'hitloc') {

        //Calc Max HP
        if (itm.system.locType ===  'general') {
          itm.system.hpMax = 0
        } else {
          itm.system.hpMax = Math.max(Math.ceil(systemData.hp.max / 3), 2) + (itm.system.hpMod ?? 0)
        }
        itm.system.currHp = itm.system.hpMax - itm.system.npcDmg
        totalDmg += itm.system.npcDmg
      } else if (itm.type === 'skill'){
        itm.system.total = (itm.system.base ?? 0) + (itm.system.effects ?? 0)
      } else if (itm.type === 'weapon') {
        itm.system.total = (itm.system.npcBase ?? 0) + (itm.system.effects ?? 0)
        let weaponSkill = actorData.items.filter(i => i.flags.aov?.cidFlag?.id === itm.system.skillCID)
        let weaponScore = 0
        if (weaponSkill.length > 0) {
          itm.system.total = itm.system.total + weaponSkill[0].system.effects
        }
      } else if (itm.type === 'passion'){
        itm.system.total = (itm.system.base ?? 0) + (itm.system.effects ?? 0)
      }
    }


    systemData.hp.value = systemData.hp.max - totalDmg
  }

  /**
   *
   */
  getRollData () {
    const data = super.getRollData()

    // Prepare character roll data.
    this._getCharacterRollData(data)

    return data
  }

  // Prepare character roll data.
  /**
   *
   * @param data
   */
  _getCharacterRollData (data) {
    if (this.type !== 'character') return

    // Copy the ability scores to the top level
    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        data[k] = foundry.utils.deepClone(v)
      }
    }
  }

  //Prepare Stats
  /**
   *
   * @param actorData
   */
  _prepStats (actorData) {
    for (let [key, ability] of Object.entries(actorData.system.abilities)) {
      if(actorData.type === 'character'){
        ability.total = Math.max(Math.min((ability.value + ability.xp + ability.age + (ability.effects ?? 0)), ability.max), 0)
      } else {
        ability.total = ability.value + ability.xp + ability.age + (ability.effects ?? 0)
      }
      ability.deriv = ability.total * 5
    }
  }

  // Calculate derived scores
  /**
   *
   * @param actorData
   */
  _prepDerivedStats (actorData) {
    const systemData = actorData.system
    systemData.hp.max = AOVActor._calcMaxHP(systemData)
    systemData.mp.max = AOVActor._calcMaxMP(systemData)
    systemData.mp.availMax = systemData.mp.max - (systemData.mp.locked ?? 0)
    systemData.dmgBonus = AOVActor._damMod(systemData)
    if (this.type === 'character') {
      systemData.moveRate = (systemData.move.base ?? 0) + (systemData.move.bonus ?? 0) + (systemData.move.effects ?? 0)
      if (systemData.move.penalty !=0) {
        systemData.moveRate = Math.ceil(systemData.moveRate * systemData.move.penalty)
      }
      systemData.healRate = AOVActor._calcHealRate(systemData)
      systemData.reputation.total = (systemData.reputation.base ?? 0) + (systemData.reputation.xp ?? 0) + (systemData.reputation.effects ?? 0) + (systemData.reputation.history ?? 0)
      systemData.status.total = (systemData.status.base ?? 0) + (systemData.status.xp ?? 0) + (systemData.status.effects ?? 0)
      systemData.maxEnc = AOVActor._maxEnc(systemData)
      systemData.age = game.settings.get('aov', 'gameYear') - systemData.birthYear

      //Skill Category Modifiers
      systemData.agi = AOVActor._skillCatAgi(systemData)
      systemData.com = AOVActor._skillCatCom(systemData)
      systemData.knw = AOVActor._skillCatKnw(systemData)
      systemData.man = AOVActor._skillCatMan(systemData)
      systemData.myt = AOVActor._skillCatMyt(systemData)
      systemData.per = AOVActor._skillCatPer(systemData)
      systemData.ste = AOVActor._skillCatSte(systemData)
      systemData.cbt = systemData.man

      //Personality Type Bonus
      if (systemData.persType) {
        switch (systemData.persType) {
          case 'mighty':
            systemData.agi += 20
            break
          case 'steadfast':
            systemData.man += 20
            systemData.cbt += 20
            //Added cbt back in after errata from JD
            break
          case 'spiritual':
            systemData.myt += 20
            break
          case 'wanderer':
            systemData.knw += 20
            break
          case 'cunning':
            systemData.per += 20
            systemData.ste += 20
            break
          case 'manipulative':
            systemData.com += 20
            break
        }
      }
    }
  }

  //Calculate ENC penalties etc
  /**
   *
   * @param actorData
   */
  _eNCPenalty (actorData) {
    const systemData = actorData.system
    if (systemData.maxEnc > systemData.actualEnc) {return}
    let penalty = Math.floor(systemData.actualEnc - systemData.maxEnc)
    systemData.moveRate = systemData.moveRate - penalty
    systemData.encPenalty = penalty * -5
    systemData.encPenaltyLabel = -penalty + ' '+ game.i18n.localize('AOV.mrAbbr') +'/' + systemData.encPenalty +'%'
  }


  //Create a new actor - When creating an actor set basics including tokenlink, bars, displays sight
  /**
   *
   * @param data
   * @param options
   */
  static async create (data, options = {}) {
    //If dropping from compendium check to see if the actor already exists in game.actors and if it does then get the game.actors details rather than create a copy
    if (options.fromCompendium) {
      let tempActor = await (game.actors.filter(actr => actr.flags?.aov?.cidFlag?.id === data.flags?.aov?.cidFlag?.id))[0]
      if (tempActor) { return tempActor }
    }


    if (typeof data.img === 'undefined') {
      switch (data.type) {
        case 'farm':
          data.img = 'systems/aov/art-assets/grain-bundle.svg'
          break
        case 'ship':
          data.img = 'systems/aov/art-assets/drakkar.svg'
          break
        case 'npc':
          data.img = 'systems/aov/art-assets/cultist.svg'
          break
        case 'party':
          data.img = 'systems/aov/art-assets/dark-squad.svg'
          break
      }
    }


    if (data.type === 'character') {
      data.prototypeToken = foundry.utils.mergeObject({
        actorLink: true,
        detectionModes: [{
          id: 'basicSight',
          range: 30,
          enabled: true
        }]
      }, data.prototypeToken || {})
    } else if (data.type === 'party') {
      data.prototypeToken = foundry.utils.mergeObject({
        actorLink: true,
        detectionModes: [{
          enabled: false
        }]
      })
      data.ownership = foundry.utils.mergeObject({
        default: 2
      })
    }
    let actor = await super.create(data, options)

    //Add CID based on actor name if the game setting is flagged.
    if (game.settings.get('aov', 'actorCID')) {
      let currID = data.flags?.aov?.cidFlag?.id ?? ''
      if (currID != '') {
        let tempID = await CID.guessId(actor)
        let priority = data.flags?.aov?.cidFlag?.priority ?? 0
        if (tempID) {
          await actor.update({
            'flags.aov.cidFlag.id': tempID,
            'flags.aov.cidFlag.lang': game.i18n.lang,
            'flags.aov.cidFlag.priority': priority
          })
          const html = $(actor.sheet.element).find('header.window-header .edit-cid-warning,header.window-header .edit-cid-exisiting')
          if (html.length) {
            html.css({
              color: (tempID ? 'orange' : 'red')
            })
          }
          actor.render()
        }
      }
    }

    if (data.type === 'character') {
      //if (!actor.system.quickstart) {
      //Get list of skills
      let skillList = await AOVSelectLists.preLoadCategoriesCategories()
      skillList = skillList.filter(itm => itm.type==='skill').filter(itm => itm.system.common).filter(itm => itm.system.category !='zzz')
      let commonSkills=[]
      for (let thisItem of skillList) {
        //if (!thisItem.system.common) {continue}
        let skillCount = await actor.items.filter(itm => itm.flags.aov?.cidFlag?.id === thisItem.flags.aov?.cidFlag?.id)
        if (skillCount.length > 0) {continue}
        let nItm = thisItem.toObject()
        nItm.system.base = await AOVActorItemDrop._AOVcalcBase(nItm, actor)
        commonSkills.push(nItm)
      }
      let newSkills = await actor.createEmbeddedDocuments('Item', commonSkills)

      let changes = {}
      for (let [key, ability] of Object.entries(actor.system.abilities)) {
        let formula = '3D6'
        let min = 3
        let max = 21
        if (['int', 'siz'].includes(key)) {
          formula = '2D6+6'
          min = 8
        }

        if (ability.formula != '') {formula = ability.formula}
        if (ability.min != 0) {min = ability.min}
        if (ability.max != 0) {max = ability.max}

        changes = Object.assign(changes, {
          [`system.abilities.${key}.formula`]: formula,
          [`system.abilities.${key}.min`]: min,
          [`system.abilities.${key}.max`]: max
        })
      }
      await actor.update(changes)
      //}
    }


    return actor
  }

  //Calculate Max Hit Points
  /**
   *
   * @param systemData
   */
  static _calcMaxHP (systemData) {
    let maxHP = systemData.abilities.con.total
    let sizBonus = Math.floor((systemData.abilities.siz.total + systemData.sizSpecial - 1) / 4) - 2
    let powBonus = Math.floor((systemData.abilities.pow.total - 1) / 4) - 2
    if (powBonus < 0) {
      powBonus++
    } else if (powBonus > 0) {
      powBonus--
    }
    maxHP = Math.max(maxHP + sizBonus + powBonus, 1)
    if (systemData.beserkerStat) {
      maxHP = maxHP * 2
    }
    maxHP = maxHP + systemData.hp.bonus + (systemData.hp.effects ?? 0)
    return maxHP
  }

  //Calculate Max Magic Points
  /**
   *
   * @param systemData
   */
  static _calcMaxMP (systemData) {
    let maxMP = systemData.abilities.pow.total
    maxMP = maxMP + systemData.mp.bonus + (systemData.mp.effects ?? 0)
    return maxMP
  }

  //Calculate Heal Rate
  /**
   *
   * @param systemData
   */
  static _calcHealRate (systemData) {
    let hr = ((Math.floor((systemData.abilities.con.total - 1) / 6) + 1) * systemData.hrAdjust) + systemData.hrBonus
    return hr
  }

  //Calculate Damage Modifier
  /**
   *
   * @param systemData
   */
  static _damMod (systemData) {
    let statTot = systemData.abilities.str.total + systemData.abilities.siz.total
    let dmgBonus = '0'
    if (statTot < 13) {
      dmgBonus = '-1D4'
    } else if (statTot > 40) {
      statTot = Math.ceil((statTot - 40) / 16) + 1
      dmgBonus = '+' + statTot + 'D6'
    } else if (statTot > 32) {
      dmgBonus = '+1D6'
    } else if (statTot > 24) {
      dmgBonus = '+1D4'
    }
    return dmgBonus
  }

  //Calculate Max Enc
  /**
   *
   * @param systemData
   */
  static _maxEnc (systemData) {
    let maxEnc = Math.ceil((systemData.abilities.str.total + systemData.abilities.con.total) / 2)
    return maxEnc
  }

  //Primary Skill Cat
  /**
   *
   * @param score
   */
  static _skillCatPri (score) {
    let bonus = (Math.ceil(score / 4) - 3) * 5
    return bonus
  }

  //Secondary Skill Cat
  /**
   *
   * @param score
   */
  static _skillCatSec (score) {
    let bonus = (Math.ceil(score / 4) - 3) * 5
    if (bonus < 0) {
      bonus += 5
    } else if (bonus > 0) {
      bonus -= 5
    }
    return bonus
  }

  //Negative Primary Skill Cat
  /**
   *
   * @param score
   */
  static _skillCatPriNeg (score) {
    let bonus = (Math.ceil(score / 4) - 3) * 5
    return -bonus
  }

  //Negative Secondary Skill Cat
  /**
   *
   * @param score
   */
  static _skillCatSecNeg (score) {
    let bonus = (Math.ceil(score / 4) - 3) * 5
    if (bonus < 0) {
      bonus += 5
    } else if (bonus > 0) {
      bonus -= 5
    }
    return -bonus
  }

  //Agility Skill Cat
  /**
   *
   * @param systemData
   */
  static _skillCatAgi (systemData) {
    let bonus = 0
    bonus += AOVActor._skillCatSec(systemData.abilities.str.total)
    bonus += AOVActor._skillCatSecNeg(systemData.abilities.siz.total)
    bonus += AOVActor._skillCatPri(systemData.abilities.dex.total)
    bonus += AOVActor._skillCatSec(systemData.abilities.pow.total)
    return bonus
  }

  //Communication Skill Cat
  /**
   *
   * @param systemData
   */
  static _skillCatCom (systemData) {
    let bonus = 0
    bonus += AOVActor._skillCatSec(systemData.abilities.int.total)
    bonus += AOVActor._skillCatSec(systemData.abilities.pow.total)
    bonus += AOVActor._skillCatPri(systemData.abilities.cha.total)
    return bonus
  }

  //Knowledge Skill Cat
  /**
   *
   * @param systemData
   */
  static _skillCatKnw (systemData) {
    let bonus = 0
    bonus += AOVActor._skillCatPri(systemData.abilities.int.total)
    bonus += AOVActor._skillCatSec(systemData.abilities.pow.total)
    return bonus
  }

  //Manipulation Skill Cat
  /**
   *
   * @param systemData
   */
  static _skillCatMan (systemData) {
    let bonus = 0
    bonus += AOVActor._skillCatSec(systemData.abilities.str.total)
    bonus += AOVActor._skillCatPri(systemData.abilities.dex.total)
    bonus += AOVActor._skillCatPri(systemData.abilities.int.total)
    bonus += AOVActor._skillCatSec(systemData.abilities.pow.total)
    return bonus
  }

  //Mythic Skill Cat
  /**
   *
   * @param systemData
   */
  static _skillCatMyt (systemData) {
    let bonus = 0
    bonus += AOVActor._skillCatPri(systemData.abilities.pow.total)
    bonus += AOVActor._skillCatSec(systemData.abilities.cha.total)
    return bonus
  }

  //Perception Skill Cat
  /**
   *
   * @param systemData
   */
  static _skillCatPer (systemData) {
    let bonus = 0
    bonus += AOVActor._skillCatPri(systemData.abilities.int.total)
    bonus += AOVActor._skillCatSec(systemData.abilities.pow.total)
    return bonus
  }

  //Stealth Skill Cat
  /**
   *
   * @param systemData
   */
  static _skillCatSte (systemData) {
    let bonus = 0
    bonus += AOVActor._skillCatPri(systemData.abilities.int.total)
    bonus += AOVActor._skillCatPri(systemData.abilities.dex.total)
    bonus += AOVActor._skillCatPriNeg(systemData.abilities.siz.total)
    bonus += AOVActor._skillCatSecNeg(systemData.abilities.pow.total)
    return bonus
  }

  //Runescript Magic Point Cost
  /**
   *
   * @param runescript
   */
  static runeMPCost (runescript) {
    let runes = 0
    for (let [key, rune] of Object.entries(runescript.system.runes)) {
      if (!['none', ''].includes(rune)) {
        runes ++
      }
    }
    let cost = runes*2
    let maxEff = Math.floor((runes-1)/2)
    let effective = false
    if ([3, 5, 7, 9].includes(runes)) {
      effective = true
    }
    return { cost, maxEff, effective }
  }

  //Seidur Spell Magic Point Cost
  /**
   *
   * @param seidur
   */
  static seidurMPCost (seidur)
  {let cost = 0
    if (seidur.system.dimension >0 ) {
      cost = cost + Math.max(((seidur.system.dimension-1)*3), 1)
    }
    if (seidur.system.distance >0 ) {
      cost = cost + Math.max(((seidur.system.distance-1)*3), 1)
    }
    if (seidur.system.duration >0 ) {
      cost = cost + Math.max(((seidur.system.duration-1)*3), 1)
    }
    let mpLocked = Math.max((seidur.system.dimension ??0 ), (seidur.system.distance ??0 ), (seidur.system.duration ?? 0 ) )
    let castTime = cost * 10
    return { cost, mpLocked, castTime }
  }

  //Used for Rolling NPCs when token dropped
  /**
   *
   */
  get hasRollableCharacteristics () {
    for (const [, value] of Object.entries(this.system.abilities)) {
      if (isNaN(Number(value.formula))) return true
      if (isNaN(Number(value.average))) return true
    }
    return false
  }

  //Roll Random Stats
  /**
   *
   */
  async rollCharacteristicsValue () {
    const abilities = {}
    for (const [key, value] of Object.entries(this.system.abilities)) {
      if (value.formula && !value.formula.startsWith('@')) {
        const r = new Roll(value.formula)
        await r.evaluate()
        if (r.total) {
          abilities[`system.abilities.${key}.value`] = Math.floor(
            r.total
          )
        }
      }
    }
    await this.update(abilities)
    await this.updateVitals()
  }

  //Roll Average Stats
  /**
   *
   */
  async averageCharacteristicsValue () {
    const abilities = {}
    for (const [key, value] of Object.entries(this.system.abilities)) {
      if (value.average && !value.average.startsWith('@')) {
        const r = new Roll(value.average)
        await r.evaluate()
        if (r.total) {
          abilities[`system.abilities.${key}.value`] = Math.floor(
            r.total
          )
        }
      }
    }
    await this.update(abilities)
    await this.updateVitals()
  }

  //Roll Stat Variants
  /**
   *
   */
  async rollCharacteristicsVariant () {
    const abilities = {}
    for (const [key, value] of Object.entries(this.system.abilities)) {
      let mod = Math.max(Math.ceil(value.formula.toUpperCase().split('D')[0]/3), 1)
      if (this.system.abilities[key].value === 0) {continue}
      const r = new Roll('1D10')
      await r.evaluate()
      let variance = 0
      if (r.total <4) {
        variance = Number(r.total - 4)
      } else if (r.total > 7) {
        variance = Number(r.total - 7)
      }
      abilities[`system.abilities.${key}.value`] = Math.max((this.system.abilities[key].value + (variance*mod)), 1)
    }
    await this.update(abilities)
    await this.updateVitals()
  }


  //Roll Skill Variants
  /**
   *
   */
  async rollSkillsVariant () {
    const updates = []
    for (const item of this.items) {
      if (item.type != 'skill' && item.type != 'weapon') {continue}
      const r = new Roll('1D10')
      await r.evaluate()
      let variance = 0
      if (r.total <4) {
        variance = Number(r.total - 4)*10
      } else if (r.total > 7) {
        variance = Number(r.total - 7)*10
      }
      if (variance != 0) {
        if (item.type === 'skill') {
          let newScore = Math.max(item.system.base + variance, 0)
          updates.push({ _id: item.id, 'system.base': newScore })
        } else if (item.type === 'weapon') {
          let newScore = Math.max(item.system.npcBase + variance, 0)
          updates.push({ _id: item.id, 'system.npcBase': newScore })
        }
      }
    }
    await this.updateEmbeddedDocuments('Item', updates)
  }

  //Update Current HP, MP etc and HPL when Rolled or Average Roll
  /**
   *
   */
  async updateVitals () {
    let checkProp = {
      'system.hp.value': this.system.hp.max,
      'system.mp.value': this.system.mp.max
    }
    await this.update(checkProp)
  }

  //Rerender Party Sheet if actor is in it
  /**
   *
   * @param actorData
   */
  async _updateParty (actorData) {
    try {
      const parties = game.actors.filter(actr => actr.type==='party' && actr.sheet.rendered && actr.system.members.find(m => m.uuid === actorData.uuid))
      for (const party of parties) {
        await party.render()
      }
    } catch (e) {
      // Called before sheet is ready
    }
  }



}
