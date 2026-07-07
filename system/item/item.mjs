import { RollType, AOVCheck, CardType } from '../apps/checks.mjs'
import { isCtrlKey } from '../apps/helper.mjs'


export class AOVItem extends Item {

  /**
   *
   * @param data
   * @param context
   */
  constructor (data, context) {
    if (typeof data.img === 'undefined') {
      if (data.type === 'armour') {
        data.img = 'systems/aov/art-assets/leather-armor.svg'
      } else if (data.type === 'devotion') {
        data.img = 'systems/aov/art-assets/viking-longhouse.svg'
      } else if (data.type === 'family') {
        data.img = 'systems/aov/art-assets/ages.svg'
      } else if (data.type === 'gear') {
        data.img = 'systems/aov/art-assets/knapsack.svg'
      } else if (data.type === 'history') {
        data.img = 'systems/aov/art-assets/scroll-unfurled.svg'
      } else if (data.type === 'hitloc') {
        data.img = 'systems/aov/art-assets/arm-bandage.svg'
      } else if (data.type === 'homeland') {
        data.img = 'systems/aov/art-assets/iceland.svg'
      } else if (data.type === 'npcpower') {
        data.img = 'systems/aov/art-assets/lightning-helix.svg'
      } else if (data.type === 'passion') {
        data.img = 'systems/aov/art-assets/shining-heart.svg'
      } else if (data.type === 'rune') {
        data.img = 'systems/aov/art-assets/rune-stone.svg'
      } else if (data.type === 'runescript') {
        data.img = 'systems/aov/art-assets/rune-sword.svg'
      } else if (data.type === 'seidur') {
        data.img = 'systems/aov/art-assets/magic-swirl.svg'
      } else if (data.type === 'skill') {
        data.img = 'systems/aov/art-assets/anvil.svg'
      } else if (data.type === 'species') {
        data.img = 'systems/aov/art-assets/embrassed-energy.svg'
      } else if (data.type === 'thrall') {
        data.img = 'systems/aov/art-assets/person.svg'
      } else if (data.type === 'weapon') {
        data.img = 'systems/aov/art-assets/axe-sword.svg'
      } else if (data.type === 'weaponcat') {
        data.img = 'systems/aov/art-assets/master-of-arms.svg'
      } else if (data.type === 'wound') {
        data.img = 'systems/aov/art-assets/cut-palm.svg'
      }
    }
    super(data, context)
  }


  /**
   *
   */
  prepareData () {
    super.prepareData()
  }

  /**
   *
   */
  getRollData () {
    const rollData = { ...this.system }
    if (!this.actor) return rollData
    rollData.actor = this.actor.getRollData()
    return rollData
  }

  /**
   *
   * @param event
   */
  async roll (event) {
    const item = this

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor })
    const rollMode = game.settings.get('core', 'rollMode')
    const label = `[${item.type}] ${item.name}`

    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: item.system.description ?? ''
      })
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData()

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.formula, rollData)
      // If you need to store the value first, uncomment the next line.
      // const result = await roll.evaluate();
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label
      })
      return roll
    }
  }

  /**
   *
   * @param data
   * @param createOptions
   * @param root0
   * @param root0.types
   */
  static async createDialog (data={}, createOptions={}, { types, ...options }={}) {
    //Enter the document types you want to remove from the side bar create option - 'base' is removed in the super
    const invalid = ['wound', 'family', 'runescript', 'seidur', 'thrall', 'npcpower']

    if (!types) types = this.TYPES.filter(type => !invalid.includes(type))
    else types = types.filter(type => !invalid.includes(type))
    return super.createDialog(data, createOptions, { types, ...options })
  }

  /** @override */
  static async _onCreateOperation (documents, operation, user) {
    super._onCreateOperation(documents, operation, user)
    /* Copied from FoundryVTT v12 item.mjs replacing Actor with ActorDelta */
    if ( !(operation.parent instanceof ActorDelta) || !CONFIG.ActiveEffect.legacyTransferral || !user.isSelf ) return
    const cls = getDocumentClass('ActiveEffect')

    // Create effect data
    const toCreate = []
    for ( let item of documents ) {
      for ( let e of item.effects ) {
        if ( !e.transfer ) continue
        const effectData = e.toJSON()
        effectData.origin = item.uuid
        toCreate.push(effectData)
      }
    }

    // Asynchronously create transferred Active Effects
    operation = { ...operation }
    delete operation.data
    operation.renderSheet = false
    // noinspection ES6MissingAwait
    cls.createDocuments(toCreate, operation)
  }

  //Handle clickable rolls from macros
  /**
   *
   */
  async roll () {
    const item = this
    const actor = this.actor
    let ctrlKey = isCtrlKey(event ?? false)
    let altKey = event.altKey
    let shiftKey = event.shiftKey
    let cardType = CardType.UNOPPOSED
    let rollType = ''
    let skillId = ''
    let itemId = ''
    switch (item.type) {
      case 'passion':
        rollType = RollType.PASSION
        skillId = item._id
        if (ctrlKey) {
          cardType = CardType.AUGMENT
        } else if(event.altKey) {
          cardType = CardType.OPPOSED
        }
        break
      case 'skill':
        rollType = RollType.SKILL
        skillId = item._id
        if (ctrlKey) {
          cardType = CardType.AUGMENT
        } else if (event.altKey) {
          cardType = CardType.OPPOSED
        }
        break
      case 'weapon':
        rollType = RollType.WEAPON
        skillId = item._id
        cardType = CardType.COMBAT
        break
      default:
        item.sheet.render(true)
        return
    }

    AOVCheck._trigger({
      rollType,
      cardType,
      shiftKey,
      skillId,
      itemId,
      event,
      actor,
      characteristic: false
    })

    return
  }

}

