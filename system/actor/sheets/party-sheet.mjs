import AOVDialog from '../../setup/aov-dialog.mjs'
import { AOVPartyDowntime } from '../party-downtime.mjs'
import { AoVActorSheet } from './base-actor-sheet.mjs'

const PARTY_ITEM_TYPES = new Set(['armour', 'gear', 'weapon'])
const PARTY_MEMBER_TYPES = new Set(['character', 'npc'])
const PARTY_SKILL_OVERVIEW_LIMIT = 12
const DOWNTIME_VIEWS = Object.freeze({
  summary: {
    id: 'summary',
    icon: 'fas fa-list',
    label: 'AOV.Party.DowntimeSummary',
    title: 'AOV.Party.DowntimeSummaryTitle'
  },
  development: {
    id: 'development',
    icon: 'fas fa-scroll',
    label: 'AOV.Party.DevelopmentPhase',
    title: 'AOV.Party.DevelopmentChecklist'
  },
  victory: {
    id: 'victory',
    icon: 'fas fa-certificate',
    label: 'AOV.Party.VictorySacrifice',
    title: 'AOV.Party.SeasonalChecklist'
  }
})

export class AoVPartySheet extends AoVActorSheet {
  /**
   *
   * @param options
   */
  constructor (options = {}) {
    super(options)
  }

  static DEFAULT_OPTIONS = {
    classes: ['party', 'party-sheet'],
    position: {
      width: 1220,
      height: 900
    },
    actions: {
      viewPartyDocument: this._onViewPartyDocument,
      removePartyCharacter: this._onRemovePartyCharacter,
      removePartyFarm: this._onRemovePartyFarm,
      removePartyShip: this._onRemovePartyShip,
      partyApplyHealingRate: this._onApplyHealingRate,
      partyResetAugments: this._onResetAugments,
      partySetDowntimeView: this._onSetDowntimeView,
      partyClearDowntimeFlags: this._onClearDowntimeFlags,
      partyRunExperience: this._onRunExperience,
      partyRunTraining: this._onRunTraining,
      partyRunResearch: this._onRunResearch,
      partyRunWorship: this._onRunWorship,
      partyRunFarmCircumstance: this._onRunFarmCircumstance,
      partyRunVadmalProduction: this._onRunVadmalProduction,
      partyRunAging: this._onRunAging,
      partyRunFamily: this._onRunFamily
    }
  }

  static PARTS = {
    header: { template: 'systems/aov/templates/actor/party/header.hbs' },
    tabs: { template: 'systems/aov/templates/generic/tab-navigation.hbs' },
    characters: {
      template: 'systems/aov/templates/actor/party/characters.hbs',
      scrollable: ['']
    },
    assets: {
      template: 'systems/aov/templates/actor/party/assets.hbs',
      scrollable: ['']
    },
    downtime: {
      template: 'systems/aov/templates/actor/party/downtime.hbs',
      scrollable: ['']
    }
  }

  /**
   *
   * @param options
   */
  _configureRenderOptions (options) {
    super._configureRenderOptions(options)
    options.parts = ['header', 'tabs', 'characters', 'assets', 'downtime']
  }

  /**
   *
   * @param parts
   */
  _getTabs (parts) {
    const tabGroup = 'primary'
    if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = 'characters'
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
          return tabs
        case 'characters':
          tab.id = 'characters'
          tab.label += 'characters'
          break
        case 'assets':
          tab.id = 'assets'
          tab.label += 'assets'
          break
        case 'downtime':
          tab.id = 'downtime'
          tab.label += 'downtime'
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
    const context = await super._prepareContext(options)
    context.tabs = this._getTabs(options.parts)
    context.showHPVal = game.settings.get('aov', 'partyHPVal') || context.isGM
    context.characters = await this.#prepareMemberSummaries(context)
    context.assets = await this.#prepareAssetSummaries()
    context.downtimeView = this.#getDowntimeView()
    context.isDowntimeSummary = context.downtimeView === 'summary'
    context.downtimeViews = this.#prepareDowntimeViews(context.downtimeView)
    context.downtimeTitle = DOWNTIME_VIEWS[context.downtimeView].title
    context.downtimeColumns = this.#prepareDowntimeColumns(context.downtimeView)
    context.downtimeGridColumns = this.#prepareDowntimeGridColumns(context.downtimeColumns)
    context.downtime = await this.#prepareDowntimeSummary()
    context.skillOverview = await this.#prepareSkillOverview()
    return context
  }

  /**
   *
   * @param partId
   * @param context
   */
  async _preparePartContext (partId, context) {
    if (['characters', 'assets', 'downtime'].includes(partId)) {
      context.tab = context.tabs[partId]
    }
    return context
  }

  /**
   *
   * @param context
   * @param options
   */
  _onRender (context, options) {
    /*
     * The base AoV sheet stores drag/drop handlers as an array, while
     * ActorSheetV2 expects its own accessor shape. Bind the local handlers
     * directly to avoid the upstream `_dragDrop.bind(...)` render failure.
     */
    this._dragDrop.forEach((d) => d.bind(this.element))
    this.element.querySelectorAll('.party-item-quantity').forEach((node) => {
      node.addEventListener('change', this.#editQuantity.bind(this))
    })
  }

  /**
   *
   * @param context
   */
  async #prepareMemberSummaries (context) {
    const members = []
    for (const reference of this.actor.system.members ?? []) {
      const uuid = reference?.uuid
      const actor = uuid ? await fromUuid(uuid) : null
      if (!actor || !PARTY_MEMBER_TYPES.has(actor.type)) {
        members.push(this.#invalidActorReference(uuid))
        continue
      }

      if (actor.type === 'npc') {
        members.push(await this.#prepareNpcMember(actor))
        continue
      }

      const distFeatures = actor.system.distFeatures ?? ''
      members.push({
        valid: true,
        isCharacter: true,
        isNpc: false,
        actorType: actor.type,
        actorTypeLabel: game.i18n.localize(`TYPES.Actor.${actor.type}`),
        uuid: actor.uuid,
        id: actor.id,
        name: actor.name,
        img: actor.img,
        nickname: actor.system.nickname,
        gender: context.isSelectGender && actor.system.gender
          ? game.i18n.localize(`AOV.${actor.system.gender}`)
          : actor.system.gender,
        age: actor.system.age,
        birthYear: actor.system.birthYear,
        spiritAn: actor.system.spiritAn,
        persType: actor.system.persType
          ? game.i18n.localize(`AOV.Personality.${actor.system.persType}`)
          : '',
        nameMean: actor.system.nameMean,
        distFeatures: distFeatures,
        distFeaturesHtml: await this.#enrichCardText(distFeatures),
        distFeaturesTooltip: this.#htmlToPlainText(distFeatures),
        abilities: ['str', 'con', 'siz', 'dex', 'int', 'pow', 'cha'].map((key) => ({
          key,
          label: game.i18n.localize(CONFIG.AOV.abilities[key]),
          value: actor.system.abilities[key]?.total ?? 0
        })),
        hp: actor.system.hp,
        mp: actor.system.mp,
        healRate: actor.system.healRate,
        dmgBonus: actor.system.dmgBonus,
        moveRate: actor.system.moveRate,
        reputation: actor.system.reputation?.total ?? 0,
        status: actor.system.status?.total ?? 0,
        enc: {
          actual: actor.system.actualEnc ?? 0,
          max: actor.system.maxEnc ?? 0,
          penaltyLabel: actor.system.encPenaltyLabel,
          overloaded: Number(actor.system.actualEnc ?? 0) > Number(actor.system.maxEnc ?? 0)
        },
        woundsCount: actor.items.filter((item) => item.type === 'wound').length,
        effectsCount: actor.effects.size
      })
    }
    return members.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   *
   * @param actor
   */
  async #prepareNpcMember (actor) {
    const damagedLocations = actor.items.filter((item) => item.type === 'hitloc' && Number(item.system.npcDmg ?? 0) > 0)
    const totalDamage = damagedLocations.reduce((total, item) => total + Number(item.system.npcDmg ?? 0), 0)
    const featuresSource = actor.system.gmNotes || actor.system.description || ''
    const distFeaturesHtml = await this.#enrichCardText(featuresSource)
    const distFeaturesTooltip = this.#htmlToPlainText(featuresSource)
    return {
      valid: true,
      isCharacter: false,
      isNpc: true,
      actorType: actor.type,
      actorTypeLabel: game.i18n.localize(`TYPES.Actor.${actor.type}`),
      uuid: actor.uuid,
      id: actor.id,
      name: actor.name,
      img: actor.img,
      nickname: game.i18n.localize('TYPES.Actor.npc'),
      gender: '',
      age: '',
      spiritAn: actor.system.spiritAn,
      persType: actor.system.persType
        ? game.i18n.localize(`AOV.Personality.${actor.system.persType}`)
        : '',
      nameMean: game.i18n.localize('TYPES.Actor.npc'),
      distFeatures: distFeaturesTooltip,
      distFeaturesHtml,
      distFeaturesTooltip,
      abilities: ['str', 'con', 'siz', 'dex', 'int', 'pow', 'cha'].map((key) => ({
        key,
        label: game.i18n.localize(CONFIG.AOV.abilities[key]),
        value: actor.system.abilities[key]?.total ?? 0
      })),
      hp: {
        value: actor.system.hp?.value ?? 0,
        max: actor.system.hp?.max ?? 0
      },
      mp: actor.system.mp,
      healRate: actor.system.healRate,
      dmgBonus: actor.system.dmgBonus,
      moveRate: actor.system.movement || actor.system.moveRate || actor.system.move?.base || '',
      reputation: actor.system.reputation?.total ?? actor.system.reputation?.base ?? 0,
      status: actor.system.status?.total ?? actor.system.status?.base ?? 0,
      enc: {
        actual: actor.system.actualEnc ?? 0,
        max: actor.system.maxEnc ?? 0,
        penaltyLabel: actor.system.encPenaltyLabel,
        overloaded: Number(actor.system.actualEnc ?? 0) > Number(actor.system.maxEnc ?? 0)
      },
      woundsCount: damagedLocations.length,
      npcDamage: totalDamage,
      effectsCount: actor.effects.size
    }
  }

  /**
   *
   */
  async #prepareAssetSummaries () {
    const assets = {
      gear: [],
      weapons: [],
      armours: [],
      farms: [],
      ships: []
    }

    for (const item of this.actor.items) {
      if (item.type === 'gear') assets.gear.push(this.#prepareGear(item))
      else if (item.type === 'weapon') assets.weapons.push(this.#prepareWeapon(item))
      else if (item.type === 'armour') assets.armours.push(this.#prepareArmour(item))
    }

    for (const reference of this.actor.system.assets?.farms ?? []) {
      const uuid = reference?.uuid
      const farm = uuid ? await fromUuid(uuid) : null
      if (!farm || farm.type !== 'farm') {
        assets.farms.push(this.#invalidActorReference(uuid))
        continue
      }
      assets.farms.push({
        valid: true,
        uuid: farm.uuid,
        name: farm.name,
        img: farm.img,
        farmType: farm.system.farmType ? game.i18n.localize(`AOV.Farm.${farm.system.farmType}`) : '',
        size: farm.system.size,
        cattle: farm.system.cattle,
        sheep: farm.system.sheep,
        horses: farm.system.horses,
        status: farm.system.status ? game.i18n.localize(`AOV.FarmCirc.${farm.system.status}`) : '',
        value: farm.system.value
      })
    }

    for (const reference of this.actor.system.assets?.ships ?? []) {
      const uuid = reference?.uuid
      const ship = uuid ? await fromUuid(uuid) : null
      if (!ship || ship.type !== 'ship') {
        assets.ships.push(this.#invalidActorReference(uuid))
        continue
      }
      assets.ships.push({
        valid: true,
        uuid: ship.uuid,
        name: ship.name,
        img: ship.img,
        shipType: ship.system.shipType,
        hullType: ship.system.hull?.type ? game.i18n.localize(`AOV.ship.${ship.system.hull.type}`) : '',
        hullQuality: ship.system.hull?.value ?? 0,
        seaworthy: ship.system.seaworthy,
        sp: ship.system.sp,
        captain: ship.system.captain,
        helmsman: ship.system.helmsman,
        boat: ship.system.boat,
        navigate: ship.system.navigate,
        cargo: ship.system.cargo,
        wind: ship.system.wind ? game.i18n.localize(`AOV.wind.${ship.system.wind}`) : '',
        crew: [
          { label: game.i18n.localize('AOV.ship.rowers'), value: ship.system.rowers, min: ship.system.rowersMin },
          { label: game.i18n.localize('AOV.ship.sailors'), value: ship.system.sailors, min: ship.system.sailorsMin },
          { label: game.i18n.localize('AOV.ship.warriors'), value: ship.system.warriors, min: ship.system.warriorsMin },
          { label: game.i18n.localize('AOV.ship.passengers'), value: ship.system.passengers, min: ship.system.passengersMin }
        ]
      })
    }

    assets.gear.sort((a, b) => a.name.localeCompare(b.name))
    assets.weapons.sort((a, b) => a.name.localeCompare(b.name))
    assets.armours.sort((a, b) => a.name.localeCompare(b.name))
    assets.farms.sort((a, b) => a.name.localeCompare(b.name))
    assets.ships.sort((a, b) => a.name.localeCompare(b.name))
    return assets
  }

  /**
   *
   */
  async #prepareDowntimeSummary () {
    /*
     * Downtime uses system.members as its only roster source. NPCs are shown in
     * summary rows, but seasonal actions stay character-only.
     */
    const rows = []
    for (const actor of await this.#getPartyRoster()) {
      const isCharacter = actor.type === 'character'
      const xpChecks = actor.items.filter((item) => ['skill', 'passion'].includes(item.type) && item.system.xpCheck).length
      const augmentUses = actor.items.filter((item) => ['skill', 'passion'].includes(item.type) && item.system.augment).length
      const wounds = isCharacter
        ? actor.items.filter((item) => item.type === 'wound')
        : actor.items.filter((item) => item.type === 'hitloc' && Number(item.system.npcDmg ?? 0) > 0)
      const farms = []
      if (isCharacter) {
        for (const reference of actor.system.farms ?? []) {
          const farm = reference?.uuid ? await fromUuid(reference.uuid) : null
          farms.push(farm?.name ?? game.i18n.localize('AOV.invalid'))
        }
      }
      rows.push({
        uuid: actor.uuid,
        name: actor.name,
        img: actor.img,
        isCharacter,
        actorTypeLabel: game.i18n.localize(`TYPES.Actor.${actor.type}`),
        xpChecks,
        augmentUses,
        wounds: wounds.length,
        untreatedWounds: isCharacter ? wounds.filter((item) => !item.system.treated).length : 0,
        age: isCharacter ? actor.system.age : '',
        agingRequired: isCharacter && actor.system.age > 40,
        flags: {
          expImprov: isCharacter && actor.system.expImprov,
          improv: isCharacter && actor.system.improv,
          worship: isCharacter && actor.system.worship,
          farming: isCharacter && actor.system.farming,
          vadprod: isCharacter && actor.system.vadprod,
          aging: isCharacter && actor.system.aging,
          family: isCharacter && actor.system.family
        },
        farms: farms.join(', ')
      })
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   *
   */
  #getDowntimeView () {
    const group = 'partyDowntime'
    if (!DOWNTIME_VIEWS[this.tabGroups[group]]) this.tabGroups[group] = 'summary'
    return this.tabGroups[group]
  }

  /**
   *
   * @param activeView
   */
  #prepareDowntimeViews (activeView) {
    return Object.values(DOWNTIME_VIEWS).map((view) => ({
      ...view,
      active: view.id === activeView
    }))
  }

  /**
   *
   * @param view
   */
  #prepareDowntimeColumns (view) {
    /*
     * Downtime subviews are local UI state only; opening the party sheet must not
     * toggle world phase settings or linked actor flags.
     */
    const columns = [{ id: 'actor', label: 'AOV.character' }]
    if (view === 'development') {
      columns.push(
        { id: 'xp', label: 'AOV.xpCheck' },
        { id: 'experience', label: 'AOV.experience' },
        { id: 'training', label: 'AOV.training' }
      )
    } else if (view === 'victory') {
      columns.push(
        { id: 'worship', label: 'AOV.worship' },
        { id: 'farming', label: 'AOV.farmCirc' },
        { id: 'vadprod', label: 'AOV.vadmalProd' },
        { id: 'aging', label: 'AOV.aging' },
        { id: 'family', label: 'AOV.family' }
      )
    } else {
      columns.push({ id: 'augments', label: 'AOV.Party.Augments' })
    }
    columns.push({ id: 'wounds', label: 'TYPES.Item.wound' })
    return columns
  }

  /**
   *
   * @param columns
   */
  #prepareDowntimeGridColumns (columns) {
    return columns.map((column) => {
      if (column.id === 'actor') return 'minmax(150px, 1.3fr)'
      if (column.id === 'xp') return '80px'
      if (column.id === 'augments') return '90px'
      if (column.id === 'wounds') return '80px'
      return 'minmax(86px, 1fr)'
    }).join(' ')
  }

  /**
   *
   */
  async #prepareSkillOverview () {
    /*
     * Skill overview is derived from linked character Items. NPC skills are
     * omitted because they use different sheet and advancement semantics.
     */
    const grouped = new Map()
    for (const actor of await this.#getPartyCharacters()) {
      for (const item of actor.items.filter((i) => i.type === 'skill')) {
        if (!this.#isPartyOverviewSkill(item)) continue
        const label = item.system.label || item.name
        const total = Number(item.system.total ?? 0)
        const row = grouped.get(label) ?? {
          label,
          best: total,
          bestActor: actor.name,
          count: 0,
          knownBy: [],
          knownByTooltip: ''
        }
        row.count += 1
        row.knownBy.push({ actorName: actor.name, total })
        if (total > row.best) {
          row.best = total
          row.bestActor = actor.name
        }
        grouped.set(label, row)
      }
    }

    return Array.from(grouped.values()).map((row) => {
      row.knownBy.sort((a, b) => b.total - a.total || a.actorName.localeCompare(b.actorName))
      row.knownByTooltip = row.knownBy
        .map((entry) => `${this.#escapeHtml(entry.actorName)}: ${entry.total}`)
        .join('<br>')
      return row
    })
      .sort((a, b) => b.best - a.best || a.label.localeCompare(b.label))
      .slice(0, PARTY_SKILL_OVERVIEW_LIMIT)
  }

  /**
   *
   * @param item
   */
  #isPartyOverviewSkill (item) {
    const total = Number(item.system.total ?? 0)
    if (total <= 0) return false
    const threshold = Math.max(Number(item.system.base ?? 0), 15)
    return total > threshold
  }

  /**
   *
   * @param value
   */
  async #enrichCardText (value) {
    if (!value) return ''
    return foundry.applications.ux.TextEditor.implementation.enrichHTML(value, { async: true })
  }

  /**
   *
   * @param value
   */
  #htmlToPlainText (value) {
    if (!value) return ''
    const element = document.createElement('div')
    element.innerHTML = String(value)
    return (element.textContent ?? element.innerText ?? '').replace(/\s+/g, ' ').trim()
  }

  /**
   *
   * @param value
   */
  #escapeHtml (value) {
    const element = document.createElement('div')
    element.textContent = String(value ?? '')
    return element.innerHTML
  }

  /**
   *
   * @param item
   */
  #prepareGear (item) {
    return {
      id: item.id,
      name: item.name,
      img: item.img,
      type: item.type,
      quantity: item.system.quantity ?? 1,
      enc: item.system.enc ?? 0,
      actualEnc: item.system.actlEnc ?? (Number(item.system.enc ?? 0) * Number(item.system.quantity ?? 1)),
      value: item.system.value ?? ''
    }
  }

  /**
   *
   * @param item
   */
  #prepareWeapon (item) {
    return {
      id: item.id,
      name: item.name,
      img: item.img,
      type: item.type,
      quantity: item.system.quantity ?? 1,
      enc: item.system.enc ?? 0,
      damage: item.system.damage,
      damageType: item.system.damType ? game.i18n.localize(`AOV.DamType.${item.system.damType}`) : '',
      hp: {
        value: item.system.currHP,
        max: item.system.maxHP
      }
    }
  }

  /**
   *
   * @param item
   */
  #prepareArmour (item) {
    const locations = item.system.lowLoc === item.system.highLoc
      ? item.system.lowLoc
      : `${item.system.lowLoc}-${item.system.highLoc}`
    return {
      id: item.id,
      name: item.name,
      img: item.img,
      type: item.type,
      quantity: item.system.quantity ?? 1,
      enc: item.system.enc ?? 0,
      ap: item.system.map,
      locations
    }
  }

  /**
   *
   * @param uuid
   */
  #invalidActorReference (uuid) {
    return {
      valid: false,
      isCharacter: false,
      isNpc: false,
      uuid,
      name: game.i18n.localize('AOV.invalid'),
      img: 'icons/svg/mystery-man.svg'
    }
  }

  /**
   *
   */
  async #getPartyRoster () {
    const actors = []
    for (const reference of this.actor.system.members ?? []) {
      const actor = reference?.uuid ? await fromUuid(reference.uuid) : null
      if (PARTY_MEMBER_TYPES.has(actor?.type)) actors.push(actor)
    }
    return actors
  }

  /**
   *
   */
  async #getPartyCharacters () {
    const actors = []
    for (const actor of await this.#getPartyRoster()) {
      if (actor?.type === 'character') actors.push(actor)
    }
    return actors
  }

  /**
   *
   * @param target
   */
  async #getCharacterFromTarget (target) {
    const actor = await fromUuid(target.dataset.uuid)
    return actor?.type === 'character' ? actor : null
  }

  /**
   *
   * @param event
   */
  async #editQuantity (event) {
    event.preventDefault()
    event.stopImmediatePropagation()
    const itemId = event.currentTarget.closest('.item')?.dataset?.itemId
    const item = this.actor.items.get(itemId)
    if (!item || !PARTY_ITEM_TYPES.has(item.type)) return
    await item.update({ 'system.quantity': Number(event.currentTarget.value) })
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onViewPartyDocument (event, target) {
    const uuid = target.dataset.uuid || target.closest('[data-uuid]')?.dataset?.uuid
    const document = uuid ? await fromUuid(uuid) : null
    if (document) document.sheet.render(true)
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onRemovePartyCharacter (event, target) {
    if (!game.user.isGM || event.detail !== 2) return
    await this.#removeMemberUuid(target.dataset.uuid)
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onRemovePartyFarm (event, target) {
    if (!game.user.isGM || event.detail !== 2) return
    await this.#removeAssetUuid('farms', target.dataset.uuid)
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onRemovePartyShip (event, target) {
    if (!game.user.isGM || event.detail !== 2) return
    await this.#removeAssetUuid('ships', target.dataset.uuid)
  }

  /**
   *
   */
  static async _onApplyHealingRate () {
    if (!game.user.isGM) return
    const confirmed = await AOVDialog.confirm({
      window: { title: game.i18n.localize('AOV.confirm') },
      content: game.i18n.localize('AOV.Party.ApplyHealingRateConfirm')
    })
    if (confirmed) {
      await AOVPartyDowntime.applyHealingRate(await this.#getPartyRoster(), this.actor)
      await this.render(false)
    }
  }

  /**
   *
   */
  static async _onResetAugments () {
    if (!game.user.isGM) return
    await AOVPartyDowntime.resetAugments(await this.#getPartyCharacters())
    await this.render(false)
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onSetDowntimeView (event, target) {
    const view = target.dataset.downtimeView
    if (!DOWNTIME_VIEWS[view]) return
    this.tabGroups.partyDowntime = view
    await this.render(false)
  }

  /**
   *
   */
  static async _onClearDowntimeFlags () {
    if (!game.user.isGM) return
    const confirmed = await AOVDialog.confirm({
      window: { title: game.i18n.localize('AOV.confirm') },
      content: game.i18n.localize('AOV.Party.ClearDowntimeFlagsConfirm')
    })
    if (confirmed) {
      await AOVPartyDowntime.clearDowntimeFlags(await this.#getPartyCharacters())
      await this.render(false)
    }
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onRunExperience (event, target) {
    await AOVPartyDowntime.runExperience(await this.#getCharacterFromTarget(target))
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onRunTraining (event, target) {
    await AOVPartyDowntime.runTraining(await this.#getCharacterFromTarget(target))
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onRunResearch (event, target) {
    await AOVPartyDowntime.runResearch(await this.#getCharacterFromTarget(target))
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onRunWorship (event, target) {
    await AOVPartyDowntime.runWorship(await this.#getCharacterFromTarget(target))
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onRunFarmCircumstance (event, target) {
    await AOVPartyDowntime.runFarmCircumstance(await this.#getCharacterFromTarget(target))
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onRunVadmalProduction (event, target) {
    await AOVPartyDowntime.runVadmalProduction(await this.#getCharacterFromTarget(target))
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onRunAging (event, target) {
    await AOVPartyDowntime.runAging(await this.#getCharacterFromTarget(target))
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onRunFamily (event, target) {
    await AOVPartyDowntime.runFamily(await this.#getCharacterFromTarget(target))
  }

  /**
   *
   * @param data
   */
  async DropActor (data) {
    const actor = await fromUuid(data.uuid)
    if (!actor) return
    switch (actor.type) {
      case 'character':
      case 'npc':
        return this.#addMemberUuid(actor.uuid)
      case 'farm':
        return this.#addAssetUuid('farms', actor.uuid)
      case 'ship':
        return this.#addAssetUuid('ships', actor.uuid)
      default:
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.cantDropActor', {
          itemType: game.i18n.localize(`TYPES.Actor.${actor.type}`),
          actorType: game.i18n.localize(`TYPES.Actor.${this.actor.type}`)
        }))
    }
  }

  /**
   *
   * @param event
   * @param data
   */
  async _onDropItem (event, data) {
    if (!this.actor.isOwner) return false
    const item = await Item.implementation.fromDropData(data)
    if (this.actor.uuid === item.parent?.uuid) return false
    if (!PARTY_ITEM_TYPES.has(item.type)) {
      ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.cantDropItem', {
        itemType: game.i18n.localize(`TYPES.Item.${item.type}`),
        actorType: game.i18n.localize(`TYPES.Actor.${this.actor.type}`)
      }))
      return false
    }

    /*
     * Party inventory is shared cargo. Bypass character-only drop rules such as
     * CID and linked-skill checks, then copy only supported inventory Items.
     */
    const itemData = item.toObject()
    delete itemData._id
    if (itemData.type === 'weapon') itemData.system.currHP = itemData.system.maxHP
    return this.actor.createEmbeddedDocuments('Item', [itemData])
  }

  /**
   *
   * @param uuid
   */
  async #addMemberUuid (uuid) {
    const links = this.#normalizePartyLinks()
    if (links.members.some((reference) => reference.uuid === uuid)) {
      ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.dupItem', { itemName: uuid }))
      return
    }
    links.members.push({ uuid })
    await this.#updatePartyLinks(links)
    await this.render(false)
  }

  /**
   *
   * @param uuid
   */
  async #removeMemberUuid (uuid) {
    const links = this.#normalizePartyLinks()
    const index = links.members.findIndex((reference) => reference.uuid === uuid)
    if (index < 0) return
    links.members.splice(index, 1)
    await this.#updatePartyLinks(links)
  }

  /**
   *
   * @param kind
   * @param uuid
   */
  async #addAssetUuid (kind, uuid) {
    const links = this.#normalizePartyLinks()
    if (links.assets[kind].some((reference) => reference.uuid === uuid)) {
      ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.dupItem', { itemName: uuid }))
      return
    }
    links.assets[kind].push({ uuid })
    await this.#updatePartyLinks(links)
    await this.render(false)
  }

  /**
   *
   * @param kind
   * @param uuid
   */
  async #removeAssetUuid (kind, uuid) {
    const links = this.#normalizePartyLinks()
    const index = links.assets[kind].findIndex((reference) => reference.uuid === uuid)
    if (index < 0) return
    links.assets[kind].splice(index, 1)
    await this.#updatePartyLinks(links)
  }

  /**
   *
   */
  #normalizePartyLinks () {
    const assets = this.actor.system.assets ?? {}
    return {
      members: this.#normalizeReferences(this.actor.system.members),
      assets: {
        farms: this.#normalizeReferences(assets.farms),
        ships: this.#normalizeReferences(assets.ships)
      }
    }
  }

  /**
   *
   * @param links
   */
  async #updatePartyLinks (links) {
    /*
     * Commit all party link arrays together with dotted paths. Updating only one
     * asset branch can replace sibling links during render/update races.
     */
    await this.actor.update({
      'system.members': links.members,
      'system.assets.farms': links.assets.farms,
      'system.assets.ships': links.assets.ships
    })
  }

  /**
   *
   * @param references
   */
  #normalizeReferences (references) {
    if (!Array.isArray(references)) return []
    return references
      .map((reference) => {
        if (typeof reference === 'string') return { uuid: reference }
        if (reference?.uuid) return { uuid: reference.uuid }
        return null
      })
      .filter((reference) => reference?.uuid)
  }

}
