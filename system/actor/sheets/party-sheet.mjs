import AOVDialog from '../../setup/aov-dialog.mjs'
import { AOVActorItemDrop } from '../actor-item-drop.mjs'
import { AOVPartyDowntime } from '../party-downtime.mjs'
import { resolveWorldFarms } from '../farm-references.mjs'
import { AoVActorSheet } from './base-actor-sheet.mjs'

const PARTY_ITEM_TYPES = new Set(['armour', 'gear', 'weapon'])
const PARTY_MEMBER_TYPES = new Set(['character', 'npc'])
const PARTY_SKILL_OVERVIEW_LIMIT = 12
const PARTY_FULL_WIDTH = 1220
const PARTY_FULL_HEIGHT = 760
const PARTY_COMPACT_WIDTH = 760
const PARTY_COMPACT_HEIGHT = 520
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
      width: PARTY_FULL_WIDTH,
      height: PARTY_FULL_HEIGHT
    },
    actions: {
      togglePartyCompact: this._onTogglePartyCompact,
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
    const showDowntime = this.#getPresentationSettings().showDowntime
    options.parts = ['header', 'tabs', 'characters', 'assets']
    if (showDowntime) options.parts.push('downtime')
    else if (this.tabGroups.primary === 'downtime') this.tabGroups.primary = 'characters'
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
    const presentation = this.#getPresentationSettings()
    const partyCompactView = game.settings.get('aov', 'partyCompactView')
    if (options.isFirstRender) {
      options.position ??= {}
      options.position.width = partyCompactView ? PARTY_COMPACT_WIDTH : PARTY_FULL_WIDTH
      options.position.height = partyCompactView ? PARTY_COMPACT_HEIGHT : PARTY_FULL_HEIGHT
    }
    context.partyCompactView = partyCompactView
    context.partyCompactToggleLabel = partyCompactView ? 'AOV.Party.FullView' : 'AOV.Party.CompactView'
    context.partyCompactToggleIcon = partyCompactView ? 'fas fa-expand' : 'fas fa-compress'
    context.tabs = this._getTabs(options.parts)
    context.showDowntime = options.parts.includes('downtime')
    context.characters = await this.#prepareMemberSummaries(context, presentation)
    context.assets = await this.#prepareAssetSummaries()
    if (context.showDowntime) {
      context.downtimeView = this.#getDowntimeView()
      context.isDowntimeSummary = context.downtimeView === 'summary'
      context.downtimeViews = this.#prepareDowntimeViews(context.downtimeView)
      context.downtimeTitle = DOWNTIME_VIEWS[context.downtimeView].title
      context.downtimeColumns = this.#prepareDowntimeColumns(context.downtimeView)
      context.downtimeGridColumns = this.#prepareDowntimeGridColumns(context.downtimeColumns)
      context.downtime = await this.#prepareDowntimeSummary(presentation)
      context.skillOverview = await this.#prepareSkillOverview(presentation)
    }
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
    this.element.classList.toggle('party-compact', context.partyCompactView)
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
   */
  static async _onTogglePartyCompact () {
    const partyCompactView = !game.settings.get('aov', 'partyCompactView')
    await game.settings.set('aov', 'partyCompactView', partyCompactView)
    await this.render(false)
    this.setPosition({
      width: partyCompactView ? PARTY_COMPACT_WIDTH : PARTY_FULL_WIDTH,
      height: partyCompactView ? PARTY_COMPACT_HEIGHT : PARTY_FULL_HEIGHT
    })
    return this
  }

  /**
   * Prepare permission-aware Party member cards.
   * @param {object} context Sheet context.
   * @param {object} presentation Effective Party presentation settings.
   * @returns {Promise<object[]>} Prepared member cards.
   */
  async #prepareMemberSummaries (context, presentation) {
    const members = []
    for (const reference of this.actor.system.members ?? []) {
      const uuid = this.#referenceUuid(reference)
      const actor = uuid ? await fromUuid(uuid) : null
      if (!actor || actor.inCompendium || !PARTY_MEMBER_TYPES.has(actor.type)) {
        if (game.user.isGM) members.push(this.#invalidActorReference(uuid))
        continue
      }

      const access = this.#getMemberAccess(actor, presentation)
      if (access === 'limited') {
        members.push(this.#prepareLimitedMember(actor, presentation))
        continue
      }

      if (actor.type === 'npc') {
        members.push(await this.#prepareNpcMember(actor, presentation))
        continue
      }

      const distFeatures = actor.system.distFeatures ?? ''
      members.push({
        valid: true,
        restricted: false,
        showFullDetails: access === 'full',
        showVitalValues: presentation.showVitalValues,
        canOpen: actor.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED),
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
        hp: this.#prepareVital(actor.system.hp),
        mp: this.#prepareVital(actor.system.mp),
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
   * Prepare a full NPC Party card.
   * @param {Actor} actor NPC Actor.
   * @param {object} presentation Effective Party presentation settings.
   * @returns {Promise<object>} Prepared NPC card.
   */
  async #prepareNpcMember (actor, presentation) {
    const damagedLocations = actor.items.filter((item) => item.type === 'hitloc' && Number(item.system.npcDmg ?? 0) > 0)
    const totalDamage = damagedLocations.reduce((total, item) => total + Number(item.system.npcDmg ?? 0), 0)
    const featuresSource = actor.system.gmNotes || actor.system.description || ''
    const distFeaturesHtml = await this.#enrichCardText(featuresSource)
    const distFeaturesTooltip = this.#htmlToPlainText(featuresSource)
    return {
      valid: true,
      restricted: false,
      showFullDetails: true,
      showVitalValues: presentation.showVitalValues,
      canOpen: actor.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED),
      isCharacter: false,
      isNpc: true,
      actorType: actor.type,
      actorTypeLabel: game.i18n.localize(`TYPES.Actor.${actor.type}`),
      uuid: actor.uuid,
      id: actor.id,
      name: actor.name,
      img: actor.img,
      nickname: '',
      gender: '',
      age: '',
      spiritAn: actor.system.spiritAn,
      persType: actor.system.persType
        ? game.i18n.localize(`AOV.Personality.${actor.system.persType}`)
        : '',
      nameMean: '',
      distFeatures: distFeaturesTooltip,
      distFeaturesHtml,
      distFeaturesTooltip,
      abilities: ['str', 'con', 'siz', 'dex', 'int', 'pow', 'cha'].map((key) => ({
        key,
        label: game.i18n.localize(CONFIG.AOV.abilities[key]),
        value: actor.system.abilities[key]?.total ?? 0
      })),
      hp: this.#prepareVital({
        value: actor.system.hp?.value ?? 0,
        max: actor.system.hp?.max ?? 0
      }),
      mp: this.#prepareVital(actor.system.mp),
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
   * Prepare detailed Downtime rows for members with effective full access.
   * @param {object} presentation Effective Party presentation settings.
   * @returns {Promise<object[]>} Prepared Downtime rows.
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
      const uuid = this.#referenceUuid(reference)
      const farm = uuid ? await fromUuid(uuid) : null
      if (!farm || farm.inCompendium || farm.type !== 'farm') {
        if (game.user.isGM) assets.farms.push(this.#invalidActorReference(uuid))
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
      const uuid = this.#referenceUuid(reference)
      const ship = uuid ? await fromUuid(uuid) : null
      if (!ship || ship.inCompendium || ship.type !== 'ship') {
        if (game.user.isGM) assets.ships.push(this.#invalidActorReference(uuid))
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
   * Prepare the aggregate Skill Overview from effectively full Characters.
   * @param {object} presentation Effective Party presentation settings.
   * @returns {Promise<object[]>} Prepared skill overview rows.
   */
  async #prepareDowntimeSummary (presentation) {
    /*
     * Downtime uses system.members as its only roster source. NPCs are shown in
     * summary rows, but seasonal actions stay character-only.
     */
    const rows = []
    for (const actor of await this.#getPartyRoster(true, presentation)) {
      const isCharacter = actor.type === 'character'
      const canRoll = isCharacter && (game.user.isGM || actor.isOwner)
      const xpChecks = actor.items.filter((item) => ['skill', 'passion'].includes(item.type) && item.system.xpCheck).length
      const augmentUses = actor.items.filter((item) => ['skill', 'passion'].includes(item.type) && item.system.augment).length
      const wounds = isCharacter
        ? actor.items.filter((item) => item.type === 'wound')
        : actor.items.filter((item) => item.type === 'hitloc' && Number(item.system.npcDmg ?? 0) > 0)
      const farms = []
      let canRunFarmCircumstance = false
      let canRunVadmal = false
      if (isCharacter) {
        const farmResolution = await resolveWorldFarms(actor)
        farms.push(...farmResolution.farms.map((farm) => farm.name))
        farms.push(...farmResolution.invalid.map(() => game.i18n.localize('AOV.invalid')))
        canRunFarmCircumstance = canRoll && farmResolution.ok && (
          game.user.isGM || farmResolution.farms.every((farm) => farm.isOwner)
        )
        canRunVadmal = canRoll && farmResolution.ok && (
          game.user.isGM || farmResolution.farms.every((farm) => (
            farm.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)
          ))
        )
      }
      rows.push({
        uuid: actor.uuid,
        name: actor.name,
        img: actor.img,
        canOpen: actor.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED),
        isCharacter,
        actorTypeLabel: game.i18n.localize(`TYPES.Actor.${actor.type}`),
        canRoll,
        canRunFarmCircumstance,
        canRunVadmal,
        xpChecks,
        augmentUses,
        wounds: wounds.length,
        untreatedWounds: isCharacter ? wounds.filter((item) => !item.system.treated).length : 0,
        treatedWounds: isCharacter ? wounds.filter((item) => item.system.treated).length : 0,
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
      columns.push(
        { id: 'augments', label: 'AOV.Party.Augments' },
        { id: 'wounds', label: 'TYPES.Item.wound' }
      )
    }
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
  async #prepareSkillOverview (presentation) {
    /*
     * Skill overview is derived from linked character Items. NPC skills are
     * omitted because they use different sheet and advancement semantics.
     */
    const grouped = new Map()
    for (const actor of await this.#getPartyCharacters(true, presentation)) {
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
    const investedXp = Number(item.system.xp ?? 0)
    if (item.system.common && investedXp > 0) return true
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
      restricted: false,
      showFullDetails: false,
      showVitalValues: false,
      canOpen: false,
      isCharacter: false,
      isNpc: false,
      uuid: game.user.isGM ? uuid : '',
      name: game.i18n.localize('AOV.invalid'),
      img: 'icons/svg/mystery-man.svg'
    }
  }

  /**
   * Prepare only the fields which a LIMITED user may see when full member
   * statistics are disabled.
   * @param {Actor} actor
   * @param {object} presentation
   * @returns {object} Prepared Limited member card.
   */
  #prepareLimitedMember (actor, presentation) {
    return {
      valid: true,
      restricted: false,
      showFullDetails: false,
      showVitalValues: presentation.showVitalValues,
      canOpen: actor.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED),
      isCharacter: actor.type === 'character',
      isNpc: actor.type === 'npc',
      actorType: actor.type,
      uuid: actor.uuid,
      id: actor.id,
      name: actor.name,
      img: actor.img,
      hp: this.#prepareVital(actor.system.hp),
      mp: this.#prepareVital(actor.system.mp)
    }
  }

  /**
   * Determine which party presentation the current user may receive.
   * @param {Actor} actor
   * @param {object} presentation
   * @returns {'full'|'limited'}
   */
  #getMemberAccess (actor, presentation = this.#getPresentationSettings()) {
    if (!presentation.wantsFullMemberStats) return 'limited'
    if (
      game.user.isGM ||
      presentation.worldAllowsFullMemberStats ||
      actor.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)
    ) {
      return 'full'
    }
    return 'limited'
  }

  /**
   * Combine world privacy policy with this user's Party-sheet preferences.
   * User preferences may reduce presentation but cannot bypass world policy.
   * @returns {object}
   */
  #getPresentationSettings () {
    const isGM = game.user.isGM
    const worldAllowsHPValues = game.settings.get('aov', 'partyHPVal')
    const worldAllowsFullMemberStats = game.settings.get('aov', 'partyShowFullMemberStats')
    const worldAllowsDowntime = game.settings.get('aov', 'partyShowDowntime')
    return {
      showVitalValues: game.settings.get('aov', 'partyUserHPVal') && (isGM || worldAllowsHPValues),
      wantsFullMemberStats: game.settings.get('aov', 'partyUserShowFullMemberStats'),
      worldAllowsFullMemberStats,
      showDowntime: game.settings.get('aov', 'partyUserShowDowntime') && (isGM || worldAllowsDowntime)
    }
  }

  /**
   * Normalize a resource value for bar rendering.
   * @param {object} vital
   */
  #prepareVital (vital = {}) {
    const rawValue = Number(vital?.value ?? 0)
    const rawMax = Number(vital?.max ?? 0)
    const value = Number.isFinite(rawValue) ? rawValue : 0
    const max = Number.isFinite(rawMax) ? rawMax : 0
    const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
    return { value, max, percent }
  }

  /**
   * Read a UUID from either the current reference object shape or a legacy
   * plain-string reference without mutating party data during rendering.
   * @param {object|string|null} reference
   * @returns {string|undefined}
   */
  #referenceUuid (reference) {
    return typeof reference === 'string' ? reference : reference?.uuid
  }

  /**
   * Resolve valid linked Characters and NPCs for Party workflows.
   * @param {boolean} fullDetailsOnly Exclude members without effective full presentation.
   * @param {object} presentation Effective Party presentation settings.
   * @returns {Promise<Actor[]>} Resolved Party roster.
   */
  async #getPartyRoster (fullDetailsOnly = false, presentation = this.#getPresentationSettings()) {
    const actors = []
    for (const reference of this.actor.system.members ?? []) {
      const uuid = this.#referenceUuid(reference)
      const actor = uuid ? await fromUuid(uuid) : null
      if (!PARTY_MEMBER_TYPES.has(actor?.type) || actor.inCompendium) continue
      const access = this.#getMemberAccess(actor, presentation)
      if (fullDetailsOnly && access !== 'full') continue
      actors.push(actor)
    }
    return actors
  }

  /**
   * Resolve linked Character Actors for Party workflows.
   * @param {boolean} fullDetailsOnly Exclude Characters without effective full presentation.
   * @param {object} presentation Effective Party presentation settings.
   * @returns {Promise<Actor[]>} Resolved Party Characters.
   */
  async #getPartyCharacters (fullDetailsOnly = false, presentation = this.#getPresentationSettings()) {
    const actors = []
    for (const actor of await this.#getPartyRoster(fullDetailsOnly, presentation)) {
      if (actor?.type === 'character') actors.push(actor)
    }
    return actors
  }

  /**
   *
   * @param target
   * @param flag
   */
  async #getCharacterFromTarget (target, flag) {
    const actor = await fromUuid(target.dataset.uuid)
    if (actor?.type !== 'character' || actor.inCompendium) return null
    if (!game.user.isGM && !actor.isOwner) {
      ui.notifications.warn(game.i18n.localize('AOV.Party.ActionNotAllowed'))
      return null
    }
    if (!actor.system[flag]) {
      ui.notifications.warn(game.i18n.localize('AOV.Party.ActionUnavailable'))
      return null
    }
    return actor
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
    if (!document || document.inCompendium) return
    if (document.documentName === 'Actor' && !document.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED)) {
      return
    }
    document.sheet.render(true)
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
    await AOVPartyDowntime.runExperience(await this.#getCharacterFromTarget(target, 'expImprov'))
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onRunTraining (event, target) {
    await AOVPartyDowntime.runTraining(await this.#getCharacterFromTarget(target, 'improv'))
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onRunResearch (event, target) {
    await AOVPartyDowntime.runResearch(await this.#getCharacterFromTarget(target, 'improv'))
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onRunWorship (event, target) {
    await AOVPartyDowntime.runWorship(await this.#getCharacterFromTarget(target, 'worship'))
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onRunFarmCircumstance (event, target) {
    await AOVPartyDowntime.runFarmCircumstance(await this.#getCharacterFromTarget(target, 'farming'))
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onRunVadmalProduction (event, target) {
    await AOVPartyDowntime.runVadmalProduction(await this.#getCharacterFromTarget(target, 'vadprod'))
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onRunAging (event, target) {
    await AOVPartyDowntime.runAging(await this.#getCharacterFromTarget(target, 'aging'))
  }

  /**
   *
   * @param event
   * @param target
   */
  static async _onRunFamily (event, target) {
    await AOVPartyDowntime.runFamily(await this.#getCharacterFromTarget(target, 'family'))
  }

  /**
   *
   * @param data
   */
  async DropActor (data) {
    const actor = await fromUuid(data.uuid)
    if (!actor) return
    if (actor.inCompendium) {
      ui.notifications.warn(game.i18n.localize('AOV.Party.OnlyWorldActors'))
      return false
    }
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
    if (!item) return false
    if (item.inCompendium) {
      ui.notifications.warn(game.i18n.localize('AOV.Party.OnlyWorldItems'))
      return false
    }
    if (this.actor.uuid === item.parent?.uuid) return false
    if (!PARTY_ITEM_TYPES.has(item.type)) {
      ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.cantDropItem', {
        itemType: game.i18n.localize(`TYPES.Item.${item.type}`),
        actorType: game.i18n.localize(`TYPES.Actor.${this.actor.type}`)
      }))
      return false
    }

    // Directory Items are copied; embedded Actor Items use the shared exact-state
    // transaction path and are normalized to Stored by the Party destination.
    const sourceActor = item.parent?.documentName === 'Actor' ? item.parent : null
    const transferItem = Boolean(sourceActor)

    if (transferItem) {
      const itemData = AOVActorItemDrop.prepareEmbeddedTransfer(item, this.actor)
      if (!itemData) return false
      return this._transferEmbeddedItem(
        item,
        () => this.actor.createEmbeddedDocuments('Item', [itemData]),
        {
          isTransferredItem: (createdItem) => createdItem.type === item.type && createdItem.name === item.name
        }
      )
    }

    const itemData = item.toObject()
    delete itemData._id
    itemData.system.equipStatus = 3
    if (itemData.type === 'weapon') itemData.system.currHP = itemData.system.maxHP

    let created
    try {
      created = await this.actor.createEmbeddedDocuments('Item', [itemData])
      if (created.length !== 1) throw new Error(`Expected one created Item, received ${created.length}.`)
    } catch (err) {
      console.error('AOV | Party Item creation failed.', err)
      ui.notifications.error(game.i18n.localize('AOV.Party.TransferCreateFailed'))
      return false
    }
    return created
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
