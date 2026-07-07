import { AoVActorSheet } from './base-actor-sheet.mjs'

export class AoVPartySheet extends AoVActorSheet {
  /**
   *
   * @param options
   */
  constructor (options = {}) {
    super(options)
  }

  static DEFAULT_OPTIONS = {
    classes: ['party'],
    position: {
      width: 1200,
      height: 160
    }
  }

  static PARTS = {
    header: {
      template: 'systems/aov/templates/actor/party.header.hbs',
      scrollable: ['']
    }
  }

  /**
   *
   * @param options
   */
  _configureRenderOptions (options) {
    super._configureRenderOptions(options)
    options.parts=['header']
  }

  /**
   *
   * @param parts
   */
  _getTabs (parts) {
    // If you have sub-tabs this is necessary to change
  }


  /**
   *
   * @param options
   */
  async _prepareContext (options) {
    let context = await super._prepareContext(options)
    context.showHPVal = game.settings.get('aov', 'partyHPVal') || context.isGM
    await this._prepareItems(context)
    return context
  }


  //Handle Actor's Items
  /**
   *
   * @param context
   */
  async _prepareItems (context) {
    const members = []

    //Not strictly items but get party members
    for (let memberUuid of this.document.system.members) {
      let member = await fromUuid(memberUuid.uuid)
      if (!member) {
        members.push ({
          'name': 'Invalid',
          'uuid': memberUuid.uuid,
          'image': 'icons/svg/mystery-man.svg',
          'hpLabel': '0/0',
          'hpPerc': '0%',
          'mpLabel': '0/0',
          'mpPerc': '0%'
        })
      } else {
        let hpLabel = member.system.hp.value + '/' + member.system.hp.max
        let hpPerc =  Number(100*member.system.hp.value / member.system.hp.max)+'%'
        let mpLabel = member.system.mp.value + '/' + member.system.mp.max
        let mpPerc =  Number(100*member.system.mp.value / member.system.mp.max)+'%'
        members.push( {
          'name': member.name,
          'uuid': member.uuid,
          'image': member.img,
          'hpLabel': hpLabel,
          'hpPerc': hpPerc,
          'mpLabel': mpLabel,
          'mpPerc': mpPerc
        })
      }
    }
    context.members = members.sort(function (a, b) {return a.name.localeCompare(b.name)})
  }



  //Activate event listeners using the prepared sheet HTML
  /**
   *
   * @param context
   * @param _options
   */
  _onRender (context, _options) {
    this._dragDrop.forEach((d) => d.bind(this.element))
    this.element.querySelectorAll('.viewFromUuid').forEach(n => n.addEventListener('click', this.#viewFromUuid.bind(this)))
    this.element.querySelectorAll('.deleteMember').forEach(n => n.addEventListener('dblclick', this.#deleteMember.bind(this)))
  }



  //--------------ACTIONS-------------------



  //--------------LISTENERS------------------

  //View Party Member
  /**
   *
   * @param event
   */
  async #viewFromUuid (event){
    event.preventDefault()
    event.stopImmediatePropagation()
    const itemId = event.currentTarget.closest('.party-member').dataset.itemId
    let viewDoc = await fromUuid(itemId)
    if (viewDoc) viewDoc.sheet.render(true)
  }

  //Delete a Party Member
  /**
   *
   * @param event
   */
  async #deleteMember (event) {
    event.preventDefault()
    event.stopImmediatePropagation()
    const itemId = event.currentTarget.closest('.party-member').dataset.itemId
    const membersIndex = this.actor.system.members.findIndex(i => (itemId && i.uuid === itemId))
    if (membersIndex > -1) {
      const members = this.actor.system.members ? foundry.utils.duplicate(this.actor.system.members) : []
      members.splice(membersIndex, 1)
      await this.actor.update({ 'system.members': members })
    }
  }

}
