import { FixedXPDialog } from './fixed-xp-selector.mjs'
import { AOVCharCreate } from './charCreate.mjs'
import { SkillsSelectDialog } from './skill-selector.mjs'
import AOVDialog from '../setup/aov-dialog.mjs'
import { AOVCheck } from '../apps/checks.mjs'
import { COCard } from '../chat/combat-chat.mjs'
import { notifyFarmReferenceErrors, resolveWorldFarms } from './farm-references.mjs'

export class  AOVCharDevelop {

  /**
   *
   * @param actor
   */
  static async expRolls (actor) {
    let improvements = []
    let updateItems =[]
    let homelandSkills = []
    let homelandOptions = []

    //Get the list of skills and passions for improvement
    let checks = await actor.items.filter(itm => ['skill', 'passion'].includes(itm.type)).filter(impItm => impItm.system.xpCheck)

    //If there is a homeland item produce list of skills to add a check for
    let homeland = await actor.items.get(actor.system.homeID)
    if (homeland) {
      for (let skillOpt of homeland.system.skills) {
        let tempSkill = (await game.aov.cid.fromCIDBest({ cid: skillOpt.cid }))[0]
        if (tempSkill) {
          let matchSkill = await checks.filter(itm => itm.flags.aov?.cidFlag?.id === tempSkill.flags.aov?.cidFlag?.id)
          if (tempSkill.system.category != 'zzz' && matchSkill.length < 1) {
            homelandSkills.push(tempSkill)
          } else {
            for (let grpSkillOpt of tempSkill.system.skills) {
              let grpSkill = (await game.aov.cid.fromCIDBest({ cid: grpSkillOpt.cid }))[0]
              if (grpSkill) {
                let matchGrpSkill = await checks.filter(itm => itm.flags.aov?.cidFlag?.id === grpSkill.flags.aov?.cidFlag?.id)
                if (matchGrpSkill.length < 1) {
                  homelandSkills.push(grpSkill)
                }
              }
            }
          }
        }
      }
      homelandSkills = homelandSkills.sort(function (a, b) { return a.name.localeCompare(b.name) })
      //Match homeland Skills to current actor skills, adding new skills if needed
      if (homelandSkills.length>0) {
        for (let homeSkill of homelandSkills) {
          let matchSkill = (await actor.items.filter(itm => itm.flags.aov?.cidFlag?.id === homeSkill.flags.aov?.cidFlag?.id))[0]
          if (matchSkill) {
            homelandOptions.push(matchSkill)
          } else {
            let newSkill = await Item.create(homeSkill, { parent: actor })
            homelandOptions.push(newSkill)
          }
        }
      }

      if (homelandOptions.length<4) {
        checks.push(homelandOptions)
      } else {
        let selectedSkills = await SkillsSelectDialog.create(homelandOptions, 3, game.i18n.localize('AOV.betweenAdventures'), '')
        checks.push(...selectedSkills)
      }
    }


    if (checks.length<1) {return}
    //Select which skills and passions to give a fixed +3% increase to
    checks = checks.sort(function (a, b) { return a.name.localeCompare(b.name) })
    let improvChoices = (await FixedXPDialog.create(checks)).map(itm => { return (itm.id) })

    //Loop through each XP Check
    for (let check of checks) {
      let inc = 0
      let success = false
      let target = check.system.total - (check.system.effects ?? 0)
      let roll = new Roll('1D100')
      await roll.evaluate()
      await AOVCharDevelop.showDiceRoll(roll)
      let rollResult =roll.total
      //If Roll 100 or exceed the skill score then improve
      if (rollResult === 100 || rollResult + (check.system.catBonus ?? 0) > target) {
        //If in the Fixed improv list increase by 3
        if(improvChoices.includes(check.id)) {
          inc = 3
        } else {
          //If not Fixed then roll 1D6
          let incRoll = new Roll('1D6')
          await incRoll.evaluate()
          await AOVCharDevelop.showDiceRoll(incRoll)
          inc = incRoll.total
        }
        success = true
      }
      updateItems.push ({ _id: check._id, 'system.xp': check.system.xp + inc, 'system.xpCheck': false })
      improvements.push({ label: check.name, success: success, incVal: inc+'%', rollResult: rollResult + (check.system.catBonus ?? 0), target: target })
    }
    //Create Chat Message
    await AOVCharDevelop.improveCard(actor, improvements, 'xpCheck')

    //Update skills and actor flag
    await Item.updateDocuments(updateItems, { parent: actor })
    await actor.update({ 'system.expImprov': false })
  }


  /**
   *
   * @param actor
   * @param source
   */
  static async trainingRoll (actor, source) {
    //Get the list of skills that can be trained
    let improvements = []
    let checks = await actor.items.filter(itm => itm.type === 'skill').filter(impItm => impItm.system.total <75 || impItm.system.noXP)
    checks = checks.sort(function (a, b) { return a.name.localeCompare(b.name) })

    let selected = await AOVCharDevelop.skillTrain(checks, source)
    if( !selected) { return }
    if (selected.chosen === 'xxx') {return}
    let inc = new Roll(selected.formula)
    await inc.evaluate()
    await AOVCharDevelop.showDiceRoll(inc)
    let rollResult =inc.total
    let item = await actor.items.get(selected.chosen)
    improvements.push({ label: item.name, success: true, incVal: rollResult+'%', rollResult: -999, target: -999 })
    await AOVCharDevelop.improveCard(actor, improvements, 'training')
    await item.update({ 'system.xp': item.system.xp + rollResult })
    await actor.update({ 'system.improv': false })
  }



  //Get skill selection
  /**
   *
   * @param checks
   * @param source
   */
  static async skillTrain (checks, source) {
    let random = '1D6-1'
    let fixed = '2'
    if (source === 'research') {
      random = '1D6-2'
      fixed = '1'
    }

    let trainList = await checks.map(itm => { return { value: itm._id, label: itm.system.label  } })
    trainList.unshift({ value: 'xxx', label: game.i18n.format('AOV.selectItem', { type: game.i18n.localize('TYPES.Item.skill') }) })

    const selectInput = foundry.applications.fields.createSelectInput({
      options: trainList,
      name: 'skillTrain'
    })
    const selectGroup = foundry.applications.fields.createFormGroup({
      input: selectInput,
      label: game.i18n.localize('AOV.trainSkill')
    })
    const content = `${selectGroup.outerHTML}`
    let inpVal = await AOVDialog.wait({
      window: { title: 'AOV.training' },
      content: content,
      buttons: [
        {
          label: game.i18n.format('AOV.random', { formula: random }),
          action: '1D6-1',
          callback: (event, button, dialog) => {
            return ({ chosen:button.form.elements.skillTrain.value, formula: random })
          }
        },
        {
          label: game.i18n.format('AOV.fixed', { val: fixed }),
          action: '2',
          callback: (event, button, dialog) => {
            return ({ chosen:button.form.elements.skillTrain.value, formula: fixed })
          }
        }
      ]
    })
    return inpVal
  }

  /**
   *
   * @param actor
   */
  static async statImpRoll (actor) {
    let statList = []
    let improvements = []
    let rollResult = -999
    let target = -999
    let improv = 0
    for (let [key, ability] of Object.entries(actor.system.abilities)) {
      //Stats that can't be improved
      if (['int', 'pow', 'siz'].includes(key)){continue}
      let tempScore = ability.value + ability.xp + ability.age
      //Only allow DEX to be improved to starting value *1.5
      if (key === 'dex' && tempScore >= ability.value * 1.5) {continue}
      //Only allow species maximum
      if (tempScore >= ability.max) {continue}
      statList.push({ value: key, label: ability.label })
    }
    statList.unshift({ value: 'xxx', label: game.i18n.format('AOV.selectItem', { type: game.i18n.localize('AOV.characteristic') }) })

    //Dialog to get stat and improvement type
    const selectInput = foundry.applications.fields.createSelectInput({
      options: statList,
      name: 'statTrain'
    })
    const selectGroup = foundry.applications.fields.createFormGroup({
      input: selectInput,
      label: game.i18n.localize('AOV.improvStat')
    })
    const content = `${selectGroup.outerHTML}`
    let inpVal = await AOVDialog.wait({
      window: { title: 'AOV.improvement' },
      content: content,
      buttons: [
        {
          label: game.i18n.localize('AOV.training'),
          action: 'training',
          callback: (event, button, dialog) => {
            return ({ chosen:button.form.elements.statTrain.value, source: 'training' })
          }
        },
        {
          label: game.i18n.localize('AOV.research'),
          action: 'research',
          callback: (event, button, dialog) => {
            return ({ chosen:button.form.elements.statTrain.value, source: 'research' })
          }
        }
      ]
    })
    //If no selection then stop
    if (!inpVal || inpVal.chosen === 'xxx') {return}

    let success = false
    //If research then test for success
    if (inpVal.source === 'research') {
      target = (actor.system.abilities[inpVal.chosen].max - actor.system.abilities[inpVal.chosen].total + actor.system.abilities[inpVal.chosen].effects)*5
      let inc = new Roll('1D100')
      await inc.evaluate()
      await AOVCharDevelop.showDiceRoll(inc)
      rollResult = inc.total
      if (inc.total <= target) {success = true}
    } else if (inpVal.source === 'training') {
      success = true
    }

    //If success then calculate improvement
    if (success) {
      let inc = new Roll('1D3-1')
      await inc.evaluate()
      await AOVCharDevelop.showDiceRoll(inc)
      //Check improvement doesn't exceed specied maximum and isn't negative
      improv =Math.max(Math.min(inc.total, actor.system.abilities[inpVal.chosen].max - actor.system.abilities[inpVal.chosen].total + actor.system.abilities[inpVal.chosen].effects), 0)
    }

    improvements.push({ label: actor.system.abilities[inpVal.chosen].label, success: success, incVal: improv, rollResult: rollResult, target: target })
    await AOVCharDevelop.improveCard(actor, improvements, 'improvement')

    await actor.update({
      [`system.abilities.${inpVal.chosen}.xp`]: actor.system.abilities[inpVal.chosen].xp + improv,
      'system.improv': false
    })
  }

  /**
   *
   * @param actor
   */
  static async worshipRoll (actor) {
    let improvements = []
    let updateItems = []
    let devotions = await actor.items.filter(itm => itm.type==='devotion')
    if (!devotions) {return}
    for (let devotion of devotions) {
      const skillCid = devotion.system.skills?.[0]?.cid
      if (!skillCid) { continue }
      let worship = (await actor.items.filter(itm => itm.flags?.aov?.cidFlag?.id === skillCid))[0]
      if (!worship) {continue}
      let inc = new Roll('1D100')
      await inc.evaluate()
      await AOVCharDevelop.showDiceRoll(inc)
      let config = await AOVCharDevelop.makeDiceRoll('1D100', worship.system.total)
      let dpMax = 0
      if (worship.system.total >= 60) {
        dpMax = 3
      } else       if (worship.system.total >= 30) {
        dpMax = 2
      } else if (worship.system.total >= 10) {
        dpMax = 1
      }
      dpMax = dpMax - devotion.system.dp
      let improv = Math.min(Math.max(config.resultLevel - 1, 0), dpMax)
      improvements.push({ label: devotion.name, success: config.resultLevel, incVal: improv, rollResult: config.rollResult, target: config.target })
      updateItems.push ({ _id: devotion._id, 'system.dp': devotion.system.dp + improv })
    }
    await AOVCharDevelop.improveCard(actor, improvements, 'worship')
    await Item.updateDocuments(updateItems, { parent: actor })
    await actor.update({ 'system.worship': false })
  }

  /**
   *
   * @param actor
   */
  static async farmCircRoll (actor, { farms = null } = {}) {
    if (!Array.isArray(farms)) {
      const resolution = await resolveWorldFarms(actor, { requireOwner: true })
      if (!resolution.ok) return notifyFarmReferenceErrors(resolution)
      farms = resolution.farms
    }
    let omen = game.settings.get('aov', 'omens')
    let omenAdj = 0
    let farmAdj = 0
    let skyrAdj = 0
    let farmingBns = 0

    //Previous Year Omen Adj
    switch (omen) {
      case 'cursed':
        omenAdj = -30
        break
      case 'illfavoured':
        omenAdj = -15
        break
      case 'good':
        omenAdj = 15
        break
      case 'blessed':
        omenAdj = 30
        break
    }
    //Skyr Production Adjustment
    let cattle = 0
    let thralls = 0
    let status = 0
    for (const farm of farms) {
      cattle = cattle + farm.system.cattle
      thralls = thralls + (await farm.items.filter(itm => itm.type === 'thrall').filter(itm => !itm.system.died)).length
    }
    //The one is for the hero
    let skyr = (cattle * 3) - actor.system.dependents - thralls - 1
    skyrAdj = Math.min(skyr, 0)*5

    for (const farm of farms) {
      let result = {
        skyrAdj,
        omenAdj,
        farmAdj : 0,
        farmingBns: 0,
        farmPYCirc: 0,
        farmAdjRoll: 0,
        farmSkillRoll: 0,
        farmSkillResult: 0
      }
      //Previous Year Farm Adjustment
      switch (farm.system.status) {
        case 'famine':
          result.farmPYCirc = -10
          break
        case 'excellent':
          result.farmPYCirc = 10
          break
        case 'superlative':
          result.farmPYCirc = 15
          break
      }

      //If Fishing or Driftwood Farm
      if (['fishing', 'driftwood'].includes(farm.system.farmType)) {
        let roll = new Roll('2D6')
        await roll.evaluate()
        await AOVCharDevelop.showDiceRoll(roll)
        result.farmAdjRoll =roll.total
        if (result.farmAdjRoll<3) {
          result.farmAdj = 0
        } else if (result.farmAdjRoll<4) {
          result.farmAdj = 5
        } else if (result.farmAdjRoll<11) {
          result.farmAdj = 10
        } else if (result.farmAdjRoll === 11) {
          result.farmAdj = 15
        } else if (result.farmAdjRoll === 12) {
          result.farmAdj = 20
        }
      }

      //Farming Skill Modifier
      let farmingSkill = (await actor.items.filter(itm => itm.flags.aov?.cidFlag?.id === 'i.skill.farm'))[0]
      if (!farmingSkill) {
        ui.notifications.warn(game.i18n.format('AOV.noSkillFound', { cid: 'i.skill.farm' }))
        return
      }
      let config = await AOVCharDevelop.makeDiceRoll('1D100', farmingSkill.system.total)
      result.farmSkillResult = config.resultLevel
      result.farmSkillRoll = config.rollResult

      switch (config.resultLevel) {
        case 0:
          result.farmingBns = -25
          break
        case 1:
          result.farmingBns = -10
          break
        case 2:
          result.farmingBns = 0
          break
        case 3:
          result.farmingBns = 10
          break
        case 4:
          result.farmingBns = 25
          break
      }
      //Make the main roll
      let mainRoll = new Roll('1d100')
      await mainRoll.evaluate()
      await AOVCharDevelop.showDiceRoll(mainRoll)
      result.rawRoll = mainRoll.total
      result.mainRoll = mainRoll.total + result.skyrAdj + result.omenAdj + result.farmAdj + result.farmingBns + result.farmPYCirc
      if (result.mainRoll <= 10) {
        result.outcome = 'famine'
        result.status = -3
        result.cattle = -1
        result.sheep = -3
      } else if (result.mainRoll <= 40) {
        result.outcome = 'bad'
        result.status = -2
        result.cattle = 0
        result.sheep = -2
      } else if (result.mainRoll <= 60) {
        result.outcome = 'good'
        result.status = 1
        result.cattle = 0
        result.sheep = 3
      } else if (result.mainRoll <= 95) {
        result.outcome = 'excellent'
        result.status = 2
        result.cattle = 1
        result.sheep = 4
      } else if (result.mainRoll > 95){
        result.outcome = 'superlative'
        result.status = 3
        result.cattle = 2
        result.sheep = 5
      }
      result.statusLabel = result.status + ' ' + game.i18n.localize('AOV.status')
      if (result.stats >= 0) {result.statusLabel = '+' + result.statusLabel}
      result.cattleLabel = result.cattle + ' ' + game.i18n.localize('AOV.cattle')
      if (result.cattle >= 0) {result.cattleLabel = '+' + result.cattleLabel}
      result.sheepLabel = result.sheep + ' ' + game.i18n.localize('AOV.sheep')
      if (result.sheep >= 0) {result.sheepLabel = '+' + result.sheepLabel}
      result.label = game.i18n.localize('AOV.FarmCirc.' + result.outcome)

      //Produce Chat Card
      await AOVCharDevelop.improveCard(farm, result, 'farmCirc')

      //Update the farm and actor
      await farm.update({
        'system.status' : result.outcome,
        'system.cattle': farm.system.cattle + result.cattle,
        'system.sheep': farm.system.sheep + result.sheep
      })
      status = status + result.status
    }
    //Update the actor
    await actor.update({
      'system.status.xp': actor.system.status.xp + status,
      'system.farming': false
    })
  }

  //Vadmal Production
  /**
   *
   * @param actor
   */
  static async vadprod (actor, { farms = null } = {}) {
    if (!Array.isArray(farms)) {
      const resolution = await resolveWorldFarms(actor, { requireObserver: true })
      if (!resolution.ok) return notifyFarmReferenceErrors(resolution)
      farms = resolution.farms
    }
    let vadmal = 0
    let sheep = 0
    let thralls = 0
    let status = 0
    let actUpd = {}
    for (const farm of farms) {
      sheep = sheep + farm.system.sheep
      thralls = thralls + (await farm.items.filter(itm => itm.type === 'thrall').filter(itm => !itm.system.died)).length
    }
    let family = ((await actor.items.filter(itm => itm.type === 'family').filter(dItm => dItm.system.depend).filter(fItm => !fItm.system.died)).length ?? 0) + 1
    vadmal = sheep - (family * 2)
    //Hero has enough/surplus vadmal
    if (vadmal >= 0) {
      actUpd = {
        'system.vadmal': actor.system.vadmal + vadmal,
        'system.vadprod': false
      }
    } else {
      if (vadmal + actor.system.vadmal < 0) {
        actUpd = {
          'system.status.xp': actor.system.status.xp - 1,
          'system.vadprod': false
        }
        status = -1
      } else {
        const confirm = await AOVDialog.confirm({
          window: { title: game.i18n.localize('AOV.confirm') },
          content: game.i18n.format('AOV.spendVadmal', { amount: vadmal * -1 })
        })
        if (confirm) {
          actUpd = {
            'system.vadmal': actor.system.vadmal + vadmal,
            'system.vadprod': false
          }
        } else {
          actUpd = {
            'system.status.xp': actor.system.status.xp - 1,
            'system.vadprod': false
          }
          status = -1
        }
      }
    }
    let result = {
      sheep,
      thralls,
      vadmal,
      family,
      status
    }
    //Produce Chat Card
    await AOVCharDevelop.improveCard(actor, result, 'vadmalProd')
    //Update actor
    await actor.update(actUpd)
  }


  //Aging Rolls
  /**
   *
   * @param actor
   */
  static async aging (actor) {
    if (actor.system.age <=40) {
      ui.notifications.warn(game.i18n.localize('AOV.noAgingRequired'))
      await actor.update({ 'system.aging': false })
      return
    }
    let points = 0
    let losses = {
      'siz': 0,
      'dex': 0,
      'str': 0,
      'con': 0
    }
    let lossRolls = []
    //Roll for Number of Points Lost
    let ageRoll = new Roll('2D6')
    await ageRoll.evaluate()
    await AOVCharDevelop.showDiceRoll(ageRoll)
    let ageResult =ageRoll.total
    points = Math.max(Math.abs(ageResult-7)-1, 0)

    if(points > 0) {
      for (let count=1; count<=points; count++) {
        let formula = '1D10'
        if (actor.system.siz.total + losses.siz <= actor.system.siz.min) {
          formula = '1D8+2'
        }
        let lossRoll = new Roll (formula)
        await lossRoll.evaluate()
        await AOVCharDevelop.showDiceRoll(lossRoll)
        let lossResult = lossRoll.total
        if (lossResult < 3) {
          losses.siz--
          lossRolls.push({ diceRoll: lossResult, label: '-1 ' + game.i18n.localize('AOV.Ability.siz') })
        } else if (lossResult < 5) {
          losses.dex--
          lossRolls.push({ diceRoll: lossResult, label: '-1 ' + game.i18n.localize('AOV.Ability.dex') })
        } else if (lossResult < 7) {
          losses.str--
          lossRolls.push({ diceRoll: lossResult, label: '-1 ' + game.i18n.localize('AOV.Ability.str') })
        } else if (lossResult < 9) {
          losses.con--
          lossRolls.push({ diceRoll: lossResult, label: '-1 ' + game.i18n.localize('AOV.Ability.con') })
        } else {
          lossRolls.push({ diceRoll: lossResult, label: 'NO LOSS' })
        }
      }
    }
    let result = {
      points,
      ageResult,
      lossRolls
    }
    //Produce Chat Card
    await AOVCharDevelop.improveCard(actor, result, 'aging')
    //Update Actor
    await actor.update({
      'system.abilities.str.age': actor.system.abilities.str.age + losses.str,
      'system.abilities.con.age': actor.system.abilities.con.age + losses.con,
      'system.abilities.siz.age': actor.system.abilities.siz.age + losses.siz,
      'system.abilities.dex.age': actor.system.abilities.dex.age + losses.dex,
      'system.aging': false
    })
  }

  //Family Rolls
  /**
   *
   * @param actor
   */
  static async family (actor) {
    //Check if spouse exists and if not offer options
    let spouse = (await actor.items.filter(itm => itm.type === 'family').filter(itm => itm.system.relationship === 'spouse').filter(itm => !itm.system.died))[0]
    let newFamily = []
    let updateItems
    let results = []
    let year = game.settings.get('aov', 'gameYear')
    if (spouse){
      results.push({ label:game.i18n.localize('AOV.spouse') + ': ' + game.i18n.localize('AOV.alreadyMarried') })
    } else {
      //Get spouse choice
      let spouseVal = await AOVDialog.wait({
        window: { title: 'AOV.spouse' },
        content: game.i18n.localize('AOV.spouseChoice'),
        buttons: [
          {
            label: game.i18n.localize('AOV.Ability.cha') + '*5',
            action: 'cha'
          },
          {
            label: game.i18n.localize('AOV.useNorseCustom'),
            action: 'norse'
          },
          {
            label: game.i18n.localize('AOV.gmPermission'),
            action: 'auto'
          },
          {
            label: game.i18n.localize('AOV.staySingle'),
            action: 'single'
          }
        ]
      })

      //Determine Outcome based on choice
      if (spouseVal === 'auto') {
        let newSpouse = await AOVCharDevelop.newSpouse(actor)
        newFamily.push(newSpouse)
        results.push({ label:game.i18n.localize('AOV.spouse') + ': ' + game.i18n.localize('AOV.gmPermission') + ', ' + game.i18n.localize('AOV.married') })
      } else if (spouseVal === 'cha') {
        let config = await AOVCharDevelop.makeDiceRoll('1D100', actor.system.abilities.cha.total*5)
        let spouseRoll = config.rollVal
        if (config.resultLevel > 1) {
          results.push({ label:game.i18n.localize('AOV.spouse') + ': ' + game.i18n.localize('AOV.Ability.cha') + ', ' + game.i18n.localize('AOV.married') + ' (' + (config.rollVal) + ')' })
          let newSpouse = await AOVCharDevelop.newSpouse(actor)
          newFamily.push(newSpouse)
        } else {
          results.push({ label:game.i18n.localize('AOV.spouse') + ': ' + game.i18n.localize('AOV.Ability.cha') + ', ' + game.i18n.localize('AOV.notMarried') + ' (' + (config.rollVal) + ')' })
        }
      } else if (spouseVal === 'norse') {
        let norse = (await actor.items.filter(itm => itm.flags.aov?.cidFlag?.id === 'i.skill.customs-norse'))[0]
        if (!norse) {
          ui.notifications.warn(game.i18n.format('AOV.noSkillFound', { cid: 'i.skill.customs-norse' }))
        } else {
          let config = await AOVCharDevelop.makeDiceRoll('1D100', norse.system.total)
          let spouseRoll = config.rollVal
          if (config.resultLevel > 1) {
            let newSpouse = await AOVCharDevelop.newSpouse(actor)
            newFamily.push(newSpouse)
            results.push({ label:game.i18n.localize('AOV.spouse') + ': ' + norse.name + ', ' + game.i18n.localize('AOV.married') + ' (' + (config.rollVal) + ')' })
          } else {
            results.push({ label:game.i18n.localize('AOV.spouse') + ': ' + norse.name + ', ' + game.i18n.localize('AOV.notMarried') + ' (' + (config.rollVal) + ')' })
          }
        }
      } else {
        results.push({ label:game.i18n.localize('AOV.spouse') + ': ' + game.i18n.localize('AOV.staySingle') })
      }
    }
    //Select rolls for Children
    let childVal = await AOVDialog.wait({
      window: { title: 'AOV.children' },
      content: game.i18n.localize('AOV.childrenChoice'),
      buttons: [
        {
          label: game.i18n.localize('AOV.no'),
          action: '0'
        },
        {
          label: game.i18n.localize('AOV.yes'),
          action: '1'
        },
        {
          label: game.i18n.localize('AOV.childrenTwo'),
          action: '2'
        }
      ]
    })


    if (childVal === '0') {
      results.push({ label:game.i18n.localize('AOV.childBirth') + ': ' + game.i18n.localize('AOV.noChildRoll') })
    } else {
      for (let counter=1; counter<= Number(childVal); counter++) {
        let childRoll = new Roll('1D100')
        await childRoll.evaluate()
        await AOVCharDevelop.showDiceRoll(childRoll)
        let rollResult =childRoll.total
        if (rollResult <= 45) {
          results.push({ label:game.i18n.localize('AOV.childBirth') + ': ' + game.i18n.localize('AOV.noChildBorn') + ' (' + rollResult + ')' })
        } else if (rollResult <= 49) {
          if (game.settings.get('aov', 'childDeath')) {
            let gender = await AOVCharDevelop.rollGender()
            newFamily.push({ name: game.i18n.localize('AOV.child'), relationship: 'child', born: year, died: year, dependent: true, gender: gender })
            results.push({ label:game.i18n.localize('AOV.childBirth') + ': ' + game.i18n.localize('AOV.diedBirth') + ' (' + rollResult + ')' })
          } else {
            results.push({ label:game.i18n.localize('AOV.childBirth') + ': ' + game.i18n.localize('AOV.noChildBorn') + ' (' + rollResult + ')' })
          }
        } else if (rollResult <= 95) {
          let gender = await AOVCharDevelop.rollGender()
          newFamily.push({ name: game.i18n.localize('AOV.child'), relationship: 'child', born: year, died: '', dependent: true, gender: gender })
          results.push({ label:game.i18n.localize('AOV.childBirth') + ': ' + game.i18n.localize('AOV.childBorn') + ' (' + rollResult + ')' })
        } else if (rollResult > 95) {
          for (let c=1; c<=2; c++) {
            let gender = await AOVCharDevelop.rollGender()
            newFamily.push({ name: game.i18n.localize('AOV.child'), relationship: 'child', born: year, died: '', dependent: true, gender: gender })
          }
          results.push({ label:game.i18n.localize('AOV.childBirth') + ': ' + game.i18n.localize('AOV.twinsBorn') + ' (' + rollResult + ')' })
        }
      }
    }

    //Add New Family Members
    let newAdditions = []
    for (let newPerson of newFamily){
      const itemData = {
        name: newPerson.name,
        type: 'family',
        system: {
          relationship: newPerson.relationship,
          gender: newPerson.gender,
          born: newPerson.born,
          died: newPerson.died
        },
        flags: {
          aov: {
            cidFlag: {
              id: 'i.family.' + newPerson.name,
              lang: game.i18n.lang,
              priority: 0
            }
          }
        }
      }
      newAdditions.push(itemData)
    }
    await Item.createDocuments(newAdditions, { parent: actor })


    //Child Death Rolls - check game setting first
    if (game.settings.get('aov', 'childDeath')) {
      //Get living children under 12 after adding newborns
      let family = await actor.items.filter(itm => itm.type==='family').filter(itm => !itm.system.dead).filter(itm => itm.system.born > year-12)
      for (let person of family) {
        let survivalRoll = new Roll('1D100')
        await survivalRoll.evaluate()
        await AOVCharDevelop.showDiceRoll(survivalRoll)
        let rollResult = survivalRoll.total
        if (rollResult <=45) {
          updateItems.push ({ _id: person._id, 'system.died': year })
          results.push({ label:game.i18n.localize('AOV.childSurvival') + ': ' + person.name + ', ' + game.i18n.localize('AOV.died') + ' (' + rollResult + ')' })
        } else if (rollResult <=49) {
          results.push({ label:game.i18n.localize('AOV.childSurvival') + ': ' + person.name + ', ' + game.i18n.localize('AOV.childIll') + ' (' + rollResult + ')' })
        } else if (rollResult <=95) {
          results.push({ label:game.i18n.localize('AOV.childSurvival') + ': ' + person.name + ', ' + game.i18n.localize('AOV.childSurvives') + ' (' + rollResult + ')' })
        } else if (rollResult >95) {
          updateItems.push ({ _id: person._id, 'system.gmNotes': person.system.gmNotes + '<p>' + game.i18n.localize('AOV.year') + ': ' + game.i18n.localize('AOV.childChanged') +'</p>' })
          results.push({ label:game.i18n.localize('AOV.childSurvival') + ': ' + person.name + ', ' + game.i18n.localize('AOV.childChanged') + ' (' + rollResult + ')' })
        }
      }

    }

    //Family Event Roll
    let familyEvent = await AOVCharDevelop.familyEvent(actor)
    let history = []
    if (familyEvent) {
      let eventName = familyEvent.split(' (')[0]
      results.push({ label: familyEvent })
      const itemData = {
        name: eventName,
        type: 'history',
        system: {
          year: year,
          description: eventName
        },
        flags: {
          aov: {
            cidFlag: {
              id: 'i.history.family-' + year,
              lang: game.i18n.lang,
              priority: 0
            }
          }
        }
      }
      history.push(itemData)
    }
    //Prepare Chat Card
    await AOVCharDevelop.improveCard(actor, results, 'familyRolls')
    await Item.updateDocuments(updateItems, { parent: actor })
    await Item.createDocuments(history, { parent: actor })
    await actor.update({ 'system.family': false })
  }



  /**
   *
   * @param actor
   * @param results
   * @param title
   */
  static async improveCard (actor, results, title) {
    let chatCard = 'systems/aov/templates/chat/character-xpCheck.hbs'
    if (title === 'worship') {
      chatCard = 'systems/aov/templates/chat/character-worship.hbs'
    } else if (title === 'farmCirc') {
      chatCard = 'systems/aov/templates/chat/farm-victory.hbs'
    } else if (title === 'vadmalProd') {
      chatCard = 'systems/aov/templates/chat/character-vadmal.hbs'
    } else if (title === 'aging') {
      chatCard = 'systems/aov/templates/chat/character-aging.hbs'
    } else if (title === 'familyRolls') {
      chatCard = 'systems/aov/templates/chat/character-victory.hbs'
    }
    title = game.i18n.localize('AOV.'+ title)

    let msgData = {
      particName: actor.name,
      particImg: actor.img,
      results: results
    }
    let rolls = {}
    let html = await foundry.applications.handlebars.renderTemplate(chatCard, msgData)
    let msg = await AOVCharCreate.showStats(html, rolls, title, actor._id)
  }

  /**
   *
   * @param roll
   */
  static async showDiceRoll (roll) {
    if(!game.settings.get('aov', 'showDiceRolls')) {return}
    if (game.modules.get('dice-so-nice')?.active) {
      game.dice3d.showForRoll(roll, game.user, true, null, false)  //Roll,user,sync,whispher,blind
    }
  }

  /**
   *
   * @param formula
   * @param target
   */
  static async makeDiceRoll (formula, target) {
    let config = {
      rollFormula: formula,
      rollType: 'NO',
      targetScore: target
    }
    await AOVCheck.makeRoll(config)
    await AOVCharDevelop.showDiceRoll(config.roll)
    return config
  }

  /**
   *
   * @param actor
   */
  static async newSpouse (actor) {
    let gender = ''
    if (game.settings.get('aov', 'binaryGender')) {
      if (actor.system.gender === 'male') {
        gender = 'female'
      } else {
        gender = 'male'
      }
    }
    let spouse = {
      name: game.i18n.localize('AOV.spouse'),
      relationship: 'spouse',
      born:actor.system.birthYear,
      dependent: true,
      gender,
      died: ''
    }
    return spouse
  }

  /**
   *
   */
  static async rollGender () {
    let roll = new Roll('1D6')
    await roll.evaluate()
    await AOVCharDevelop.showDiceRoll(roll)
    if (roll.total % 2 === 0) {
      return 'male'
    } else {
      return 'female'
    }
  }

  /**
   *
   * @param actor
   */
  static async familyEvent (actor) {
    let relationTable = (await game.aov.cid.fromCIDBest({ cid: 'rt..family-member' }))[0]
    if (!relationTable) {
      ui.notifications.error(game.i18n.format('AOV.ErrorMsg.noTable', { tableCID: 'rt..family-member' }))
      return false
    }
    let eventTable = (await game.aov.cid.fromCIDBest({ cid: 'rt..family-event' }))[0]
    if (!eventTable) {
      ui.notifications.error(game.i18n.format('AOV.ErrorMsg.noTable', { tableCID: 'rt..family-event' }))
      return false
    }
    let blessingTable = (await game.aov.cid.fromCIDBest({ cid: 'rt..blessing' }))[0]
    if (!blessingTable) {
      ui.notifications.error(game.i18n.format('AOV.ErrorMsg.noTable', { tableCID: 'rt..blessing' }))
      return false
    }
    let scandalTable = (await game.aov.cid.fromCIDBest({ cid: 'rt..scandal' }))[0]
    if (!scandalTable) {
      ui.notifications.error(game.i18n.format('AOV.ErrorMsg.noTable', { tableCID: 'rt..scandal' }))
      return false
    }

    //Repeat process until we get an acceptable outcome
    let accept = false
    let eventResult = ''
    while (!accept) {
      const relationTableResults = await COCard.tableDiceRoll(relationTable)
      let relationRoll = relationTableResults.roll.total
      let relationResult = await relationTableResults.results[0].name

      const eventTableResults = await COCard.tableDiceRoll(eventTable)
      let eventRoll = eventTableResults.roll.total
      eventResult = await eventTableResults.results[0].name.toLowerCase()


      if (eventResult === 'Nothing remarkable happened') {
        eventResult = game.i18n.localize('AOV.familyEvent') + ': ' + eventResult + '(' + evemtRoll + ')'
      } else {
        eventResult = game.i18n.localize('AOV.familyEvent') + ': ' + relationResult + ', ' + eventResult + '(' + eventRoll + '/' + relationRoll + ')'
      }

      //Confirm the Event is Acceptable
      const confirm = await AOVDialog.confirm({
        window: { title: game.i18n.localize('AOV.familyEvent') },
        content: eventResult
      })

      if (confirm) {
        accept = true
      }
    }
    return eventResult
  }


}

