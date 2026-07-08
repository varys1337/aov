import { AOVDamage } from '../apps/damage.mjs'
import { AOVCharCreate } from './charCreate.mjs'
import { AOVCharDevelop } from './charDevelop.mjs'

const CHARACTER_DOWNTIME_FLAGS = {
  'system.expImprov': true,
  'system.improv': true,
  'system.worship': true,
  'system.farming': true,
  'system.vadprod': true,
  'system.aging': true,
  'system.family': true
}

const CLEAR_DOWNTIME_FLAGS = Object.fromEntries(
  Object.keys(CHARACTER_DOWNTIME_FLAGS).map((key) => [key, false])
)

const DEVELOPMENT_FLAGS = {
  'system.expImprov': true,
  'system.improv': true
}

const CLEAR_DEVELOPMENT_FLAGS = Object.fromEntries(
  Object.keys(DEVELOPMENT_FLAGS).map((key) => [key, false])
)

export class AOVPartyDowntime {
  /**
   * Apply healing to linked party characters/NPCs and publish one aggregate chat card.
   *
   * The actual wound mutations are delegated to AOVDamage.healrateChar with chat
   * creation disabled. That keeps the party workflow on the same healing rules as
   * the single-character/global healing phase while avoiding a burst of separate
   * chat cards. The returned structured reports are then rendered into one party
   * summary that includes characters or NPCs whose injuries did not change.
   * @param {Actor[]} actors      Linked party character or NPC Actors.
   * @param {Actor} partyActor    The party Actor used as chat speaker context.
   */
  static async applyHealingRate (actors, partyActor) {
    const healableActors = AOVPartyDowntime.#healableActors(actors)
    if (!healableActors.length) {
      ui.notifications.warn(game.i18n.localize('AOV.Party.NoLinkedCharacters'))
      return
    }

    const reports = []
    for (const actor of healableActors) {
      reports.push(await AOVDamage.healrateChar(actor, { createChat: false }))
    }

    const html = await foundry.applications.handlebars.renderTemplate(
      'systems/aov/templates/chat/party-healing.hbs',
      {
        particName: partyActor?.name ?? game.i18n.localize('TYPES.Actor.party'),
        particImg: partyActor?.img ?? 'icons/svg/mystery-man.svg',
        reports
      }
    )
    await AOVCharCreate.showStats(html, {}, game.i18n.localize('AOV.Party.HealingReport'), partyActor?._id)
  }

  /**
   *
   * @param actors
   */
  static async resetAugments (actors) {
    for (const actor of AOVPartyDowntime.#characters(actors)) {
      const updates = actor.items
        .filter((item) => ['skill', 'passion'].includes(item.type))
        .filter((item) => item.system.augment)
        .map((item) => ({ _id: item.id, 'system.augment': false }))
      if (updates.length) await actor.updateEmbeddedDocuments('Item', updates)
    }
  }

  /**
   * Toggle Development Phase for this party's linked characters only.
   *
   * The world setting is still updated so AoV's existing scene controls and sheet
   * labels remain coherent, but no unlinked world characters are touched. This is
   * intentionally narrower than global menu tools: a party sheet button should
   * operate on the party roster the GM is looking at, not the whole world.
   * @param {Actor[]} actors  Linked party character Actors.
   */
  static async toggleDevelopment (actors) {
    if (game.settings.get('aov', 'developmentEnabled')) {
      return AOVPartyDowntime.disableDevelopment(actors)
    }
    return AOVPartyDowntime.enableDevelopment(actors)
  }

  /**
   *
   * @param actors
   */
  static async enableDevelopment (actors) {
    await game.settings.set('aov', 'developmentEnabled', true)
    await game.settings.set('aov', 'createEnabled', false)
    await game.settings.set('aov', 'victoryEnabled', false)
    AOVPartyDowntime.#setSceneControlState({ devphase: true, createphase: false, victoryphase: false })

    for (const actor of AOVPartyDowntime.#characters(actors)) {
      await actor.update(DEVELOPMENT_FLAGS)
    }
  }

  /**
   *
   * @param actors
   */
  static async disableDevelopment (actors) {
    await game.settings.set('aov', 'developmentEnabled', false)
    AOVPartyDowntime.#setSceneControlState({ devphase: false })

    for (const actor of AOVPartyDowntime.#characters(actors)) {
      await actor.update(CLEAR_DEVELOPMENT_FLAGS)
    }
  }

  /**
   * Toggle Victory Sacrifice for this party's linked characters only.
   *
   * Victory enables every seasonal downtime flag on linked members because the
   * existing AoV victory workflow treats those flags as the actionable checklist.
   * Disabling reverses only those flags for the linked party roster and leaves
   * unrelated actors untouched.
   * @param {Actor[]} actors  Linked party character Actors.
   */
  static async toggleVictorySacrifice (actors) {
    if (game.settings.get('aov', 'victoryEnabled')) {
      return AOVPartyDowntime.disableVictorySacrifice(actors)
    }
    return AOVPartyDowntime.enableVictorySacrifice(actors)
  }

  /**
   *
   * @param actors
   */
  static async enableVictorySacrifice (actors) {
    await game.settings.set('aov', 'victoryEnabled', true)
    await game.settings.set('aov', 'developmentEnabled', false)
    await game.settings.set('aov', 'createEnabled', false)
    AOVPartyDowntime.#setSceneControlState({ devphase: false, createphase: false, victoryphase: true })

    for (const actor of AOVPartyDowntime.#characters(actors)) {
      await actor.update(CHARACTER_DOWNTIME_FLAGS)
    }
  }

  /**
   *
   * @param actors
   */
  static async disableVictorySacrifice (actors) {
    await game.settings.set('aov', 'victoryEnabled', false)
    AOVPartyDowntime.#setSceneControlState({ victoryphase: false })

    for (const actor of AOVPartyDowntime.#characters(actors)) {
      await actor.update(CLEAR_DOWNTIME_FLAGS)
    }
  }

  /**
   *
   * @param actors
   */
  static async clearDowntimeFlags (actors) {
    for (const actor of AOVPartyDowntime.#characters(actors)) {
      await actor.update(CLEAR_DOWNTIME_FLAGS)
    }
  }

  /**
   *
   * @param actor
   */
  static async runExperience (actor) {
    if (AOVPartyDowntime.#canRun(actor, 'expImprov')) await AOVCharDevelop.expRolls(actor)
  }

  /**
   *
   * @param actor
   */
  static async runTraining (actor) {
    if (AOVPartyDowntime.#canRun(actor, 'improv')) await AOVCharDevelop.trainingRoll(actor, 'training')
  }

  /**
   *
   * @param actor
   */
  static async runResearch (actor) {
    if (AOVPartyDowntime.#canRun(actor, 'improv')) await AOVCharDevelop.trainingRoll(actor, 'research')
  }

  /**
   *
   * @param actor
   */
  static async runWorship (actor) {
    if (AOVPartyDowntime.#canRun(actor, 'worship')) await AOVCharDevelop.worshipRoll(actor)
  }

  /**
   *
   * @param actor
   */
  static async runFarmCircumstance (actor) {
    if (AOVPartyDowntime.#canRun(actor, 'farming')) await AOVCharDevelop.farmCircRoll(actor)
  }

  /**
   *
   * @param actor
   */
  static async runVadmalProduction (actor) {
    if (AOVPartyDowntime.#canRun(actor, 'vadprod')) await AOVCharDevelop.vadprod(actor)
  }

  /**
   *
   * @param actor
   */
  static async runAging (actor) {
    if (AOVPartyDowntime.#canRun(actor, 'aging')) await AOVCharDevelop.aging(actor)
  }

  /**
   *
   * @param actor
   */
  static async runFamily (actor) {
    if (AOVPartyDowntime.#canRun(actor, 'family')) await AOVCharDevelop.family(actor)
  }

  /**
   *
   * @param actors
   */
  static #characters (actors) {
    return actors.filter((actor) => actor?.type === 'character')
  }

  /**
   *
   * @param actors
   */
  static #healableActors (actors) {
    return actors.filter((actor) => ['character', 'npc'].includes(actor?.type))
  }

  /**
   *
   * @param actor
   * @param flag
   */
  static #canRun (actor, flag) {
    return actor?.type === 'character' && actor.system[flag]
  }

  /**
   *
   * @param states
   */
  static #setSceneControlState (states) {
    const tools = ui.controls?.controls?.aovmenu?.tools
    if (!tools) return
    for (const [tool, active] of Object.entries(states)) {
      if (tools[tool]) tools[tool].active = active
    }
    void ui.controls.render()
  }
}
