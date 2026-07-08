import { AOVSelectLists } from '../../apps/select-lists.mjs'
import { AoVActorSheet } from './base-actor-sheet.mjs'
import { AOVActiveEffect } from '../../apps/active-effects.mjs'
import { AOVActiveEffectSheet } from '../../sheets/aov-active-effect-sheet.mjs'

export class AoVCharacterSheet extends AoVActorSheet {
  /**
   *
   * @param options
   */
  constructor (options = {}) {
    super(options)
  }

  static DEFAULT_OPTIONS = {
    classes: ['character'],
    position: {
      width: 700,
      height: 950,
      left: 250
    }
  }

  static PARTS = {
    header: { template: 'systems/aov/templates/actor/character.header.hbs' },
    headerSmall: { template: 'systems/aov/templates/actor/character.header.small.hbs' },
    tabs: { template: 'systems/aov/templates/actor/character-tab.hbs' },
    tabsSmall: { template: 'systems/aov/templates/actor/character-tab-small.hbs' },

    quickstart: { template: 'systems/aov/templates/actor/character.quickstart.hbs' },
    notes: {
      template: 'systems/aov/templates/actor/character.notes.hbs',
      scrollable: ['']
    },
    gmTab: {
      template: 'systems/aov/templates/actor/character.gmtab.hbs',
      scrollable: ['']
    },
    family: {
      template: 'systems/aov/templates/actor/character.family.hbs',
      scrollable: ['']
    },
    stats: {
      template: 'systems/aov/templates/actor/character.stats.hbs',
      scrollable: ['']
    },
    gear: {
      template: 'systems/aov/templates/actor/character.gear.hbs',
      scrollable: ['']
    },
    skills: {
      template: 'systems/aov/templates/actor/character.skills.hbs',
      scrollable: ['']
    },
    combat: {
      template: 'systems/aov/templates/actor/character.combat.hbs',
      scrollable: ['']
    },
    devotions: {
      template: 'systems/aov/templates/actor/character.devotions.hbs',
      scrollable: ['']
    },
    runes: {
      template: 'systems/aov/templates/actor/character.runes.hbs',
      scrollable: ['']
    },
    history: {
      template: 'systems/aov/templates/actor/character.history.hbs',
      scrollable: ['']
    },
    effects: {
      template: 'systems/aov/templates/actor/character.effects.hbs',
      scrollable: ['']
    }
  }

  /**
   *
   * @param options
   */
  _configureRenderOptions (options) {
    super._configureRenderOptions(options)

    //Common parts to the character - this is the order they are show on the sheet
    options.parts=[]

    if (this.actor.system.quickstart) {
      options.parts.push('header', 'quickstart')
    } else {
      if (!game.settings.get('aov', 'smallScreen')){
        options.parts.push('header', 'tabs')
      }
      //GM only tabs
      if (game.user.isGM) {
        options.parts.push('gmTab')
      }
      //Last tab is at the top of the list on the character sheet
      options.parts.push('stats', 'effects', 'notes', 'history', 'family', 'gear', 'devotions', 'runes', 'combat', 'skills')

      if (game.settings.get('aov', 'smallScreen')){
        options.parts.push('tabsSmall', 'headerSmall')
        options.parts.reverse()
      }
    }
  }

  /**
   *
   * @param parts
   */
  _getTabs (parts) {
    // If you have sub-tabs this is necessary to change
    const tabGroup = 'primary'
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup]) {
      let createState = game.settings.get('aov', 'createEnabled')
      if (createState) {
        this.tabGroups[tabGroup] = 'stats'
      }  else {
        this.tabGroups[tabGroup] = 'combat'
      }
    }
    let singleColour = game.settings.get('aov', 'singleColourBar')
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: '',
        group: tabGroup,
        id: '',
        icon: '',
        label: 'AOV.Tabs.'
      }
      switch (partId) {
        case 'header':
        case 'tabs':
        case 'headerSmall':
        case 'tabsSmall':
          return tabs
        case 'skills':
          tab.id = 'skills'
          tab.label += 'skills'
          tab.colour = 'tab-green'
          break
        case 'combat':
          tab.id = 'combat'
          tab.label += 'combat'
          tab.colour = 'tab-blue'
          if (singleColour) tab.colour = 'tab-green'
          break
        case 'runes':
          tab.id = 'runes'
          tab.label += 'magic'
          tab.colour = 'tab-red'
          if (singleColour) tab.colour = 'tab-green'
          break

        case 'devotions':
          tab.id = 'devotions'
          tab.label += 'devotions'
          tab.colour = 'tab-green'
          if (singleColour) tab.colour = 'tab-green'
          break
        case 'gear':
          tab.id = 'gear'
          tab.label += 'gear'
          tab.colour = 'tab-blue'
          if (singleColour) tab.colour = 'tab-green'
          break

        case 'family':
          tab.id = 'family'
          tab.label += 'family'
          tab.colour = 'tab-red'
          if (singleColour) tab.colour = 'tab-green'
          break

        case 'history':
          tab.id = 'history'
          tab.label += 'history'
          tab.colour = 'tab-green'
          if (singleColour) tab.colour = 'tab-green'
          break

        case 'notes':
          tab.id = 'notes'
          tab.label += 'notes'
          tab.colour = 'tab-blue'
          if (singleColour) tab.colour = 'tab-green'
          break

        case 'effects':
          tab.id = 'effects'
          tab.label += 'effects'
          tab.colour = 'tab-red'
          if (singleColour) tab.colour = 'tab-green'
          break

        case 'stats':
          tab.id = 'stats'
          tab.label += 'stats'
          tab.colour = 'tab-green'
          if (singleColour) tab.colour = 'tab-green'
          break

        case 'gmTab':
          tab.id = 'gmTab'
          tab.label += 'gmTab'
          tab.colour = 'tab-yellow'
          break
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = 'active'
      tabs[partId] = tab
      return tabs
    }, {})
  }


  /**
   *
   * @param options
   */
  async _prepareContext (options) {
    let context = await super._prepareContext(options)

    //If game setting is for small screen and this is first render set the character sheet size
    if (game.settings.get('aov', 'smallScreen') && options.isFirstRender){
      options.position.height = 600
    } else if (!game.settings.get('aov', 'smallScreen') && options.isFirstRender){
      options.position.height = 950
    }

    context.tabs = this._getTabs(options.parts)
    context.persTypeOptions = await AOVSelectLists.persType()
    context.persTypeOptions = Object.assign({ '':'' }, context.persTypeOptions)
    context.persName = game.i18n.localize('AOV.Personality.' + this.actor.system.persType)
    if (this.actor.system.persType === '') {context.persName = ''}
    context.dpOptions = await AOVSelectLists.dpOptions()
    context.useRandom = game.settings.get('aov', 'randomDice')
    context.useAssign = game.settings.get('aov', 'allocatedDice')
    context.usePoints = game.settings.get('aov', 'allocatePoints')
    context.isSmall = game.settings.get('aov', 'smallScreen')
    context.genderOptions = await AOVSelectLists.genderOptions()
    context.genderOptions = Object.assign({ '':'' }, context.genderOptions)
    context.genderName = game.i18n.localize('AOV.' + context.system.gender)
    context.socialOptions = await AOVSelectLists.getSocialRank()
    context.socialName = game.i18n.localize('AOV.' + context.system.social)
    if (context.system.gender === '') {context.genderName = ''}
    if (!context.usePoints && !context.useAssign) {
      context.useRandom = true
    }

    context.allowEdit = false
    if (context.isCreate || !context.isLocked) {
      context.allowEdit = true
    }


    await this._prepareItems(context)
    return context
  }

  /** @override */
  async _preparePartContext (partId, context) {
    switch (partId) {
      case 'combat':
      case 'skills':
      case 'gear':
      case 'family':
      case 'runes':
      case 'devotions':
      case 'history':
      case 'stats':
        context.tab = context.tabs[partId]
        break
      case 'notes':
        context.tab = context.tabs[partId]
        context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          this.actor.system.description,
          {
            async: true,
            secrets: this.document.isOwner,
            rollData: this.actor.getRollData(),
            relativeTo: this.actor
          }
        )
        break
      case 'effects':
        context.tab = context.tabs[partId]
        context.effects = await AOVActiveEffectSheet.getActorEffectsFromSheet(this.document)
        break
      case 'gmTab':
        context.tab = context.tabs[partId]
        context.enrichedGMNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          this.actor.system.gmNotes,
          {
            async: true,
            secrets: this.document.isOwner,
            rollData: this.actor.getRollData(),
            relativeTo: this.actor
          }
        )
        break
    }
    return context
  }

  //Handle Actor's Items
  /**
   *
   * @param context
   */
  async _prepareItems (context) {
    const gear = []
    const skills = []
    const passions = []
    const devSkills = []
    const hitLocs = []
    const devHitLocs = []
    const temphitLocs = []
    const wounds = []
    const devotions = []
    const families = []
    const farms = []
    const thralls = []
    const weapons = []
    const armours = []
    const runes = []
    const runescripts = []
    const seidurs = []
    const histories = []

    //Not strictly items but get farm actors to get thrall items
    for (let farmUuid of this.document.system.farms) {
      let farm = await fromUuid(farmUuid.uuid)
      if (!farm) {
        farms.push ({
          'name': 'Invalid',
          'uuid': farmUuid.uuid,
          'size': '',
          'farmType': '',
          'value': ''
        })
      } else {
        farms.push( {
          'name': farm.name,
          'uuid': farm.uuid,
          'size': farm.system.size,
          'farmType': game.i18n.localize('AOV.Farm.' + farm.system.farmType),
          'value': farm.system.value
        })
        for (let fItm of farm.items) {
          if (fItm.type==='thrall') {
            let genderLabel = fItm.system.gender
            if (context.isSelectGender) {
              genderLabel = game.i18n.localize('AOV.'+fItm.system.gender)
            }
            thralls.push({
              'uuid': fItm.uuid,
              'name': fItm.name,
              'born': fItm.system.born,
              'died': fItm.system.died,
              'genderLabel': genderLabel,
              'farmName': farm.name
            })
          }
        }
      }
    }
    context.thrallCount = (await thralls.filter(itm => !itm.died)).length

    for (let itm of this.document.items) {
      if (itm.type === 'gear') {
        gear.push(itm)
      } else if (itm.type === 'skill') {
        devSkills.push(itm)
        itm.isType = false
        if(this.actor.system.quickstart) {
          if (itm.system.category != 'cbt') {
            skills.push(itm)
          }
        } else if((this.actor.system.uncommon && itm.system.common) || !this.actor.system.uncommon) {
          skills.push(itm)
        }
      } else if (itm.type === 'passion') {
        passions.push(itm)
      } else if (itm.type === 'hitloc') {
        if (itm.system.lowRoll === itm.system.highRoll) {
          itm.system.label = itm.system.lowRoll
        } else {
          itm.system.label = itm.system.lowRoll + '-' + itm.system.highRoll
        }
        temphitLocs.push(itm)
        devHitLocs.push(itm)
      } else if (itm.type === 'wound') {
        wounds.push(itm)
      } else if (itm.type === 'devotion') {
        devotions.push(itm)

      } else if (itm.type === 'family') {
        if (context.isSelectGender) {
          itm.system.genderLabel = game.i18n.localize('AOV.'+itm.system.gender)
        } else {
          itm.system.genderLabel = itm.system.gender
        }
        itm.relationLabel = game.i18n.localize('AOV.Relation.' + itm.system.relationship)
        families.push(itm)
      } else if (itm.type === 'weapon') {
        itm.system.damTypeLabel = game.i18n.localize('AOV.DamType.'+ itm.system.damType)
        itm.system.dbLabel = game.i18n.localize('AOV.DamMod.'+itm.system.damMod)
        itm.system.damLabel = itm.system.damage
        if (itm.system.damMod === 'd' && this.actor.system.dmgBonus !='0') {
          itm.system.damLabel = itm.system.damLabel + this.actor.system.dmgBonus
        } else if (itm.system.damMod === 'h') {
          if (this.actor.system.dmgBonus !='0') {
            let hdb = (this.actor.system.dmgBonus).split('D')
            if (hdb[1]) {
              itm.system.damLabel = itm.system.damLabel + hdb[0] + 'D' + Number(hdb[1]/2)
            }
          }
        }
        weapons.push(itm)
      } else if (itm.type === 'armour') {
        itm.system.armourLocLabel = itm.system.lowLoc
        if (itm.system.lowLoc != itm.system.highLoc) {
          itm.system.armourLocLabel = itm.system.armourLocLabel + '-' + itm.system.highLoc
        }
        armours.push(itm)
      } else if (itm.type === 'rune') {
        runes.push(itm)
      } else if (itm.type === 'runescript') {
        runescripts.push(itm)
      } else if (itm.type === 'seidur') {
        seidurs.push(itm)
      } else if (itm.type === 'history') {
        itm.system.shortDesc = itm.system.description.replace(/(<([^>]+)>)/ig, '')
        itm.system.order = itm.flags.aov?.cidFlag?.id
        histories.push(itm)
      }
    }

    //Add Skill Categories
    if(!this.actor.system.alphaSkills && !this.actor.system.quickstart) {
      skills.push(
        { name: game.i18n.localize('AOV.skillCat.agi'), isType: true, system: { label: game.i18n.localize('AOV.skillCat.agi'), total: this.actor.system.agi, category: 'agi' } },
        { name: game.i18n.localize('AOV.skillCat.com'), isType: true, system: { label: game.i18n.localize('AOV.skillCat.com'), total: this.actor.system.com, category: 'com' } },
        { name: game.i18n.localize('AOV.skillCat.knw'), isType: true, system: { label: game.i18n.localize('AOV.skillCat.knw'), total: this.actor.system.knw, category: 'knw' } },
        { name: game.i18n.localize('AOV.skillCat.man'), isType: true, system: { label: game.i18n.localize('AOV.skillCat.man'), total: this.actor.system.man, category: 'man' } },
        { name: game.i18n.localize('AOV.skillCat.myt'), isType: true, system: { label: game.i18n.localize('AOV.skillCat.myt'), total: this.actor.system.myt, category: 'myt' } },
        { name: game.i18n.localize('AOV.skillCat.per'), isType: true, system: { label: game.i18n.localize('AOV.skillCat.per'), total: this.actor.system.per, category: 'per' } },
        { name: game.i18n.localize('AOV.skillCat.ste'), isType: true, system: { label: game.i18n.localize('AOV.skillCat.ste'), total: this.actor.system.ste, category: 'ste' } },
        { name: game.i18n.localize('AOV.skillCat.cbt'), isType: true, system: { label: game.i18n.localize('AOV.skillCat.cbt'), total: this.actor.system.cbt, category: 'cbt' } }
      )
      skills.sort(function (a, b) {
        let x = a.name.toLowerCase()
        let y = b.name.toLowerCase()
        let r = a.system.category
        let s = b.system.category
        let p = a.isType
        let q = b.isType
        if (r < s) { return -1 };
        if (r > s) { return 1 };
        if (p < q) { return 1 };
        if (p > q) { return -1 };
        if (x < y) { return -1 };
        if (x > y) { return 1 };
        return 0
      })
    } else {
      skills.sort(function (a, b) {
        let x = a.name.toLowerCase()
        let y = b.name.toLowerCase()
        if (x < y) { return -1 };
        if (x > y) { return 1 };
        return 0
      })
    }

    //Sort Hit Locs to grid locations
    for (let count=0; count<13; count++) {
      let thisLoc = temphitLocs.filter(itm => itm.system.gridPos === count)
      if (thisLoc.length>0) {
        hitLocs.push(thisLoc[0])
      } else {
        hitLocs.push ({ name: 'blank' })
      }
    }

    //Sort DevHitLocs by location
    devHitLocs.sort(function (a, b) {
      let x = a.system.highRoll
      let y = b.system.highRoll
      if (x < y) { return 1 };
      if (x > y) { return -1 };
      return 0
    })

    //Sort Armour on Hit Loc
    armours.sort(function (a, b) {
      let x = a.system.highLoc
      let y = b.system.highLoc
      if (x < y) { return 1 };
      if (x > y) { return -1 };
      return 0
    })

    //Sort Runescripts on Prepared then name
    runescripts.sort(function (a, b) {
      let x = a.name
      let y = b.name
      let r = a.system.prepared
      let s = b.system.prepared
      if (r < s) { return 1 };
      if (r > s) { return -1 };
      if (x < y) { return -1 };
      if (x > y) { return 1 };
      return 0
    })

    //Sort Seidur Spells on Active then name
    seidurs.sort(function (a, b) {
      let x = a.name
      let y = b.name
      let r = a.system.prepared
      let s = b.system.prepared
      if (r < s) { return 1 };
      if (r > s) { return -1 };
      if (x < y) { return -1 };
      if (x > y) { return 1 };
      return 0
    })

    //Sort Histories on Year then name
    histories.sort(function (a, b) {
      let x = a.system.order
      let y = b.system.order
      let r = a.system.year
      let s = b.system.year
      if (r < s) { return 1 };
      if (r > s) { return -1 };
      if (x < y) { return 1 };
      if (x > y) { return -1 };
      return 0
    })

    context.gear = gear.sort(function (a, b) {return a.name.localeCompare(b.name)})
    context.skills = skills
    context.passions = passions.sort(function (a, b) {return a.name.localeCompare(b.name)})
    context.devSkills = devSkills.sort(function (a, b) {return a.name.localeCompare(b.name)})
    context.hitLocs = hitLocs
    context.devHitLocs = devHitLocs
    context.wounds = wounds
    context.devotions = devotions.sort(function (a, b) {return a.name.localeCompare(b.name)})
    context.families = families.sort(function (a, b) {return a.name.localeCompare(b.name)})
    context.thralls = thralls.sort(function (a, b) {return a.name.localeCompare(b.name)})
    context.farms = farms.sort(function (a, b) {return a.name.localeCompare(b.name)})
    context.weapons = weapons.sort(function (a, b) {return a.name.localeCompare(b.name)})
    context.armours = armours
    context.runes = runes.sort(function (a, b) {return a.name.localeCompare(b.name)})
    context.runescripts = runescripts
    context.seidurs = seidurs
    context.histories = histories
  }



  //Activate event listeners using the prepared sheet HTML
  /**
   *
   * @param context
   * @param _options
   */
  _onRender (context, _options) {
    this._dragDrop.forEach((d) => d.bind(this.element))
    this.element.querySelectorAll('.item-quantity').forEach(n => n.addEventListener('change', this.#editQty.bind(this)))
    this.element.querySelectorAll('.skill-inline').forEach(n => n.addEventListener('change', this.#skillInline.bind(this)))
    this.element.querySelectorAll('.viewFromUuid').forEach(n => n.addEventListener('click', this.#viewFromUuid.bind(this)))
    this.element.querySelectorAll('.deleteFarm').forEach(n => n.addEventListener('dblclick', this.#deleteFarm.bind(this)))
  }



  //--------------ACTIONS-------------------



  //--------------LISTENERS------------------
  //Handle Actor Toggles
  /**
   *
   * @param event
   */
  async #editQty (event) {
    event.preventDefault()
    event.stopImmediatePropagation()
    const newQuantity = event.currentTarget.value
    const itemId = event.currentTarget.closest('.item').dataset.itemId
    const item = this.actor.items.get(itemId)
    await item.update({ 'system.quantity': newQuantity })
  }

  //Edit Skills Inline
  /**
   *
   * @param event
   */
  async #skillInline (event) {
    event.preventDefault()
    event.stopImmediatePropagation()
    const itemId = event.currentTarget.closest('.item').dataset.itemId
    let newVal = Number(event.target.value)
    const field = 'system.' + event.target.dataset.field
    const item = this.actor.items.get(itemId)
    if (item.type==='devotion') {
      newVal = Math.min(item.system.dpMax, newVal)
      await item.update({ [field]: newVal })
      this.render(true)
      return
    }
    await item.update({ [field]: newVal })
  }

  //View Thrall item embedded in a farm
  /**
   *
   * @param event
   */
  async #viewFromUuid (event){
    event.preventDefault()
    event.stopImmediatePropagation()
    const itemId = event.currentTarget.closest('.item').dataset.itemId
    let viewDoc = await fromUuid(itemId)
    if (viewDoc) viewDoc.sheet.render(true)
  }

  //Delete a Farm
  /**
   *
   * @param event
   */
  async #deleteFarm (event) {
    event.preventDefault()
    event.stopImmediatePropagation()
    const itemId = event.currentTarget.closest('.item').dataset.itemId
    const farmsIndex = this.actor.system.farms.findIndex(i => (itemId && i.uuid === itemId))
    if (farmsIndex > -1) {
      const farms = this.actor.system.farms ? foundry.utils.duplicate(this.actor.system.farms) : []
      farms.splice(farmsIndex, 1)
      await this.actor.update({ 'system.farms': farms })
    }
  }

}
