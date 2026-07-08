/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs.
 * @param {object} [options]
 * @param {boolean} [options.bypassVersionCheck]  Bypass certain migration restrictions gated behind system
 *                                                      version stored in item stats.
 * @returns {Promise}      A Promise which resolves once the migration is completed
 */
export async function updateWorld ({ bypassVersionCheck = false } = {}) {
  const currentVersion = game.settings.get('aov', 'systemVersion')
  const targetVersion = game.system.version
  let migrate136 = false
  let migrate1310 = false
  let migrate1312 = false

  //If not a new install then check for migrations
  if (currentVersion !='') {
    //Message if current system is less that Version 13.6
    if (foundry.utils.isNewerVersion('13.6', currentVersion ?? '0')) {
      migrate136 = true
    }
    //Message if current system is less that Version 13.10
    if (foundry.utils.isNewerVersion('13.10', currentVersion ?? '0')) {
      migrate1310 = true
    }
    //Message if current system is less that Version 13.12
    if (foundry.utils.isNewerVersion('13.12', currentVersion ?? '0')) {
      migrate1312 = true
    }
  }

  let msgdata = {
    currentVersion,
    targetVersion,
    migrate136,
    migrate1310,
    migrate1312
  }

  let response = await updateDialog('systems/aov/templates/updates/welcome.hbs', msgdata)

  //Message if current system is less that Version 13.6
  if (migrate136) {
    if (!response) {
      ui.notifications.warn('Item Migration to Version 13.6 cancelled')
      return
    }
    await damTypeUpdate()
  }

  //Message if current system is less that Version 13.10
  if (migrate1310) {
    if (!response) {
      ui.notifications.warn('Item Migration to Version 13.10 cancelled')
      return
    }
    await charStartStats()
  }

  //Message if current system is less that Version 13.12
  if (migrate1312) {
    if (!response) {
      ui.notifications.warn('Item Migration to Version 13.12 cancelled')
      return
    }
    await skillNameUpdate()
  }

  await game.settings.set('aov', 'systemVersion', targetVersion)
  logMigration(`World migration complete. System version set to ${targetVersion}.`)
}

export async function updateDialog (msg, data) {
  const content = await foundry.applications.handlebars.renderTemplate(msg, data)
  const response = await foundry.applications.api.DialogV2.prompt({
    position: {
      width: 500
    },
    classes: ['aov', 'item'],
    window: {
      title: 'Update'
    },
    content,
    modal: true
  })
  return response
}

export async function damTypeUpdate () {
  let updated = 0
  //Update World Items
  for (let item of game.items) {
    if (item.type != 'weapon') { continue }
    if (item.system.weaponType === 'missile') {
      updated += await updateDamageModifier(item, 'n')
    } else if (item.system.weaponType === 'thrown') {
      updated += await updateDamageModifier(item, 'h')
    }
  }

  //Update Items in World Actors
  for (let actor of game.actors) {
    for (let item of actor.items) {
      if (item.type != 'weapon') { continue }
      if (item.system.weaponType === 'missile') {
        updated += await updateDamageModifier(item, 'n')
      } else if (item.system.weaponType === 'thrown') {
        updated += await updateDamageModifier(item, 'h')
      }
    }
  }


  // Update Items in  Scenes [Token] Actors
  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      if (token.actorLink) { continue }
      for (let item of token.delta.items) {
        if (item.type != 'weapon') { continue }
        if (item.system.weaponType === 'missile') {
          updated += await updateDamageModifier(item, 'n')
        } else if (item.system.weaponType === 'thrown') {
          updated += await updateDamageModifier(item, 'h')
        }
      }
    }
  }
  logMigration(`Damage type migration updated ${updated} weapon item(s).`)
  return updated
}

export async function charStartStats () {
  let updated = 0
  //Update Items in World Actors
  for (let actor of game.actors) {
    if (actor.type != 'character') {continue}
    let changes = {}
    for (let [key, ability] of Object.entries(actor.system.abilities)) {
      let formula = '3D6'
      let min = 3
      let max = 21
      if (['int', 'siz'].includes(key)) {
        formula = '2D6+6'
        min = 8
      }
      if (actor.system.abilities[key].formula === '') {
        changes = Object.assign(changes, {
          [`system.abilities.${key}.formula`]: formula,
          [`system.abilities.${key}.min`]: min,
          [`system.abilities.${key}.max`]: max
        })
      }
    }
    if (!Object.keys(changes).length) { continue }
    await actor.update(changes)
    updated += 1
  }
  logMigration(`Character start stats migration updated ${updated} actor(s).`)
  return updated
}

export async function skillNameUpdate () {
  let updated = 0
  //Update Items in World
  for (let item of game.items) {
    if (item.type != 'skill') {continue}
    if (item.system.mainName != '') {continue}
    await item.update({ 'system.mainName': item.name })
    updated += 1
  }
  //Update Skills in Actors
  for (let actor of game.actors) {
    for (let item of actor.items) {
      if (item.type != 'skill') {continue}
      if (item.system.mainName != '') {continue}
      await item.update({ 'system.mainName': item.name })
      updated += 1
    }
  }
  // Update Items in  Scenes [Token] Actors
  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      if (token.actorLink) { continue }
      for (let item of token.delta.items) {
        if (item.type != 'skill') { continue }
        if (item.system.mainName != '') {continue}
        await item.update({ 'system.mainName': item.name })
        updated += 1
      }
    }
  }
  logMigration(`Skill name migration updated ${updated} skill item(s).`)
  return updated

}

async function updateDamageModifier (item, damMod) {
  if (item.system.damMod === damMod) return 0
  await item.update({ 'system.damMod': damMod })
  return 1
}

function logMigration (message) {
  if (!game.user?.isGM) return
  console.info(`AOV | ${message}`)
}

