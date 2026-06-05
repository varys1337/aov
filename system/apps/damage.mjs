import AOVDialog from "../setup/aov-dialog.mjs"
import { AOVUtilities } from "./utilities.mjs"
import { AOVCharCreate } from "../actor/charCreate.mjs"

export class AOVDamage {

  static async healingPhase() {
    const confirm = await AOVDialog.confirm({
      window: { title: game.i18n.localize('AOV.confirm') },
      content: game.i18n.localize('AOV.healingPhase')
    })
    if (!confirm) {
      return
    }
    for (let actor of game.actors) {
      if (actor.type !== 'character') {continue}
        await AOVDamage.healrateChar(actor)

    }
    //Update character sheets
    game.socket.emit('system.aov', {
      type: 'healChar'
    })
    AOVUtilities.updateCharSheets(false)
  }


  static async healrateChar(actor) {

    let updateItems = []
    let deleteItems = []
    let healing = []
    let hitLocs = actor.items.filter(itm=>itm.type==='hitloc')
    for (let hitLoc of hitLocs) {
      let wounds = actor.items.filter(itm=>itm.type==='wound').filter(wItm=>wItm.system.hitLocId === hitLoc._id)
      if (wounds.length <1) {continue}
    //Sort the wounds by damage value
    wounds.sort(function (a, b) {
      let x = a.system.damage;
      let y = b.system.damage;
      if (x < y) { return -1 };
      if (x > y) { return 1 };
      return 0;
    })
      let healTot = actor.system.healRate
      for (let wound of wounds) {
        updateItems.push ({_id: wound._id, 'system.treated': true})
        let heal = Math.min(wound.system.damage,healTot)
        let damage = wound.system.damage - heal
        healTot = healTot - heal
        if (heal > 0) {
          healing.push({
            locName: hitLoc.name,
            damage: wound.system.damage,
            healed: heal,
            newDam: damage
          })
      }
        if (damage < 1) {
          deleteItems.push(wound.id)
        } else {
          updateItems.push ({_id: wound._id, 'system.damage': damage})
        }
      }
    }
    await Item.updateDocuments(updateItems, { parent: actor })
    await Item.deleteDocuments(deleteItems, { parent: actor })

    if (healing.length > 0) {
      //Create Chat Message
      let msgData = {
        particName: actor.name,
        particImg: actor.img,
        results: healing
      }
      let rolls = {}
      let html = await foundry.applications.handlebars.renderTemplate("systems/aov/templates/chat/character-healing.hbs", msgData);
      let msg = await AOVCharCreate.showStats(html, rolls, game.i18n.localize('AOV.weeklyHealing'), actor._id)
    }
    return
  }

  static async addWound(actor, hitLocId, damage) {
    const docCls = getDocumentClass('Item');
    const docData = {
      name: docCls.defaultName({
        type: 'wound',
        parent: actor
      }),
      type: 'wound',
      system: {
        hitLocId: hitLocId,
        damage: damage
      }
    };
    // Create the embedded document
    const newItem = await docCls.create(docData, { parent: actor });

    if (game.settings.get('aov', "actorItemCID")) {
      let key = await game.aov.cid.guessId(newItem)
      await newItem.update({
        'flags.aov.cidFlag.id': key,
        'flags.aov.cidFlag.lang': game.i18n.lang,
        'flags.aov.cidFlag.priority': 0
      })
    }
      return;
  }
}
