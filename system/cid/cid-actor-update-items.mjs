/* global Actor, ActorSheet, canvas, CONFIG, FormApplication, foundry, fromUuid, game, ui */
import { AOV } from '../setup/config.mjs'

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api


export class AOVCIDActorUpdateItems extends HandlebarsApplicationMixin(ApplicationV2) {


  static DEFAULT_OPTIONS = {
    tag: 'form',
    name: 'aov-id-actor-update-items',
    classes: ['aov', 'dialog', 'investigator-wizard'],
    form: {
      handler: AOVCIDActorUpdateItems.formHandler,
      closeOnSubmit: true,
      submitOnClose: false,
      submitOnChange: false
    },
    position: {
      width: 600,
      height: 420
    },
    actions: {
      cancel: AOVCIDActorUpdateItems.onCancel
    },
    window: {
      title: 'AOV.ActorCID.ItemsBest',
      contentClasses: ['standard-form']
    }
  }

  /**
   *
   */
  get title () {
    return `${game.i18n.localize(this.options.window.title)}`
  }

  static PARTS = {
    form: { template: 'systems/aov/templates/cid/cid-actor-update-items.hbs' },
    footer: { template: 'templates/generic/form-footer.hbs' }
  }

  /**
   *
   * @param options
   */
  async _prepareContext (options) {

    const sheetData = await super._prepareContext()
    sheetData.lang = CONFIG.supportedLanguages[game.i18n.lang] ?? '?'
    sheetData.isEn = game.i18n.lang === 'en'
    let submitLabel = game.i18n.localize('AOV.ActorCID.ItemsUpdate')
    let cancelLabel = game.i18n.localize('AOV.cancel')
    return {
      sheetData,
      buttons: [
        { type: 'submit', icon: 'fa-solid fa-check', label: submitLabel },
        { type: 'button', action: 'cancel', icon: 'fa-solid fa-ban', label: cancelLabel }
      ]
    }
  }

  /**
   *
   * @param item
   */
  getUpdateData (item) {
    const output = {
      flags: {
        aov: {
          cidFlag: item.flags.aov.cidFlag
        }
      },
      name: item.name,
      system: {}
    }

    //Not really is use for AOV at this time - consider for future use/refactoring
    for (const key of ['chat', 'keeper', 'notes', 'opposingDifficulty', 'pushedFaillureConsequences', 'special', 'value']) {
      if (typeof item.system.description?.[key] === 'string' && item.system.description[key].length) {
        if (!Object.prototype.hasOwnProperty.call(output.system, 'description')) {
          output.system.description = {}
        }
        output.system.description[key] = item.system.description[key]
      }
    }
    switch (item.type) {
      case 'skill':
        break
      case 'spell':
        break
      case 'status':
        break
      case 'weapon':
        output.system.damage = item.system.damage
        break
    }
    return output
  }

  /**
   *
   * @param actorList
   * @param parent
   */
  async updateActors (actorList, parent) {
    if (parent) {
      const unlinkedActors = await actorList.filter(a => a.token?.actorLink === false).map(a => a.id).filter((a, o, v) => v.indexOf(a) === o).reduce(async (c, i) => {
        c.push(await fromUuid('Actor.' + i))
        return c
      }, [])
      actorList = unlinkedActors.concat(actorList)
    }
    //Look through each Actor and then each item.  Push a list of all item CIDs in to ids
    const ids = {}
    for (const actor of actorList) {

      for (const item of actor.items.contents) {
        if (typeof item.flags?.aov?.cidFlag?.id === 'string') {
          ids[item.flags.aov.cidFlag.id] = {}
        }
      }
    }

    //Pull back a list of the best match items based on ids
    const found = await game.aov.cid.fromCIDRegexBest({ cidRegExp: game.aov.cid.makeGroupRegEx(Object.keys(ids)), type: 'i', showLoading: true })

    //Go through the best match list and retrieve the item with whatever changes we have determined
    for (const item of found) {
      ids[item.flags.aov.cidFlag.id] = this.getUpdateData(item.toObject())
    }

    //Loop through the actors
    for (const actor of actorList) {
      const updates = []
      //Loop through each item on the actor and push the best match over to updates
      for (const item of actor.items.contents) {
        if (Object.prototype.hasOwnProperty.call(ids, item.flags?.aov?.cidFlag?.id)) {
          updates.push(foundry.utils.mergeObject({
            _id: item.id
          }, ids[item.flags.aov.cidFlag.id]))
        }
      }
      //If there are updates then update the embedded items in the actor
      if (updates.length) {
        await Item.implementation.updateDocuments(updates, { parent: actor })
      }
    }
  }

  /**
   *
   * @param event
   * @param form
   * @param formData
   */
  static async formHandler (event, form, formData) {
    const usage = foundry.utils.expandObject(formData.object)
    if (event.submitter.className.indexOf('currently-submitting') > -1) {
      return
    }
    event.submitter.className = event.submitter.className + ' currently-submitting'
    const parent = typeof usage['cid-actor-update-items-parent'] === 'string'
    const which = (usage['cid-actor-update-items-which'] ?? '').toString()
    let activeList = []
    switch (which) {
      //Tokens on Scene
      case '1':
        for (const body of canvas.scene.tokens.contents) {
          if (typeof body.uuid === 'string') {
            if (body.actorLink) {
              activeList.push(body.actor)
            } else {
              let tempBody = await fromUuid(body.actor.uuid)
              activeList.push(tempBody)
            }
          }
        }
        await this.updateActors(activeList, parent)
        break
      //Open Actor Sheets
      case '2':
        for (const body of foundry.applications.instances.values()) {
          if (body.document instanceof Actor) {
            activeList.push(body.document)
          }
        }
        await this.updateActors(activeList, parent)
        break
      //Game Actors
      case '3':
        await this.updateActors(game.actors.contents, false)
        break
    }
  }

  /**
   *
   * @param event
   * @param form
   * @param formData
   */
  static async onCancel (event, form, formData) {
    this.close()
  }

  /**
   *
   * @param options
   */
  static async create (options = {}) {
    new AOVCIDActorUpdateItems(options).render(true)
  }
}
