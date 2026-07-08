import AOVDialog from '../setup/aov-dialog.mjs'
import { AOVActiveEffect } from '../apps/active-effects.mjs'

export class AOVActiveEffectSheet {
  /**
   *
   * @param document
   */
  static getItemEffectsFromSheet (document) {
    let thisDocument = document.effects.reduce((c, i) => {
      c.push({
        id: i.id,
        uuid: i.uuid,
        name: i.name
      })
      return c
    }, [])
    return (document.items ?? []).reduce((c, i) => {
      for (const effect of i.effects) {
        c.push({
          id: effect.id,
          uuid: effect.uuid,
          name: effect.name
        })
      }
      return c
    }, thisDocument)
  }

  /**
   *
   * @param document
   */
  static getEffectChangesFromSheet (document) {
    const effectChanges = []
    const effectKeys = foundry.utils.duplicate(CONFIG.AOV.keysActiveEffects)
    for (const effect of document.effects) {
      for (const change of effect.system.changes) {
        let oneShot = false
        if (['system.healing', 'system.injure', 'system.damageObject'].includes(change.key)) {oneShot=true}
        let effValue = change.value
        if (typeof change.value === 'number') { effValue = Math.abs(change.value)}
        //        if (change.type === 'add') {
        effectChanges.push({
          key: change.key,
          name: effectKeys[change.key] ?? change.key,
          negative: (change.value < 0),
          value: effValue,
          source: effect.name,
          itemSource: effect.parent.name,
          oneShot: oneShot
        })

        //      }
      }
    }
    return {
      effectChanges
    }
  }

  /**
   *
   * @param document
   */
  static async getActorEffectsFromSheet (document) {
    const effectKeys = foundry.utils.duplicate(CONFIG.AOV.keysActiveEffects)
    let aEffects = this.getItemEffectsFromSheet(document)
    let effects = []
    for (let eff of aEffects) {
      let aovAE = await fromUuid(eff.uuid)
      if (aovAE) {
        const sourceItem = (aovAE.parent.parent instanceof Item ? aovAE.parent.parent : aovAE.parent instanceof Item ? true : false)
        const sourceName = (aovAE.parent.parent instanceof Item ? aovAE.parent.parent : aovAE.parent instanceof Item ? aovAE.parent.name : game.i18n.localize('AOV.direct'))
        const container = (aovAE.parent.parent instanceof Item ? aovAE.parent.parent : aovAE.parent instanceof Item ? aovAE.parent : aovAE)
        let count = 0
        for (let chng of aovAE.changes) {
          let oneShot = false
          if (['system.healing', 'system.injure', 'system.damageObject'].includes(chng.key)) {oneShot=true}
          effects.push({
            id: container.id,
            sourceName: sourceName,
            effectName: aovAE.name,
            sourceItem,
            key: chng.key,
            name: game.i18n.localize((effectKeys[chng.key] ?? chng.key)),
            value: chng.value,
            isActive: aovAE.active ?? false,
            oneShot: oneShot,
            effUuid: eff.uuid,
            counter: count
          })
          count++
        }
      }
    }
    return effects
  }

  /**
   *
   * @param document
   */
  static activateListeners (document) {
    if (game.user.isGM) {
      document.element.querySelectorAll('div[data-action="openActiveEffect"]').forEach(n => n.addEventListener('click', AOVActiveEffectSheet._onOpenActiveEffect.bind(document)))
      document.element.querySelectorAll('a[data-action="createEffect"]').forEach(n => n.addEventListener('click', AOVActiveEffectSheet._onAddItemEffect.bind(document)))
    }
  }

  /**
   *
   * @param event
   */
  static async _onAddItemEffect (event) {
    await this.document.createEmbeddedDocuments('ActiveEffect', [{ name: ActiveEffect.defaultName({ parent: this.document }) }])
  }

  /**
   *
   * @param event
   */
  static async _onOpenActiveEffect (event) {
    const uuid = event.currentTarget.dataset.uuid
    if (uuid) {
      const doc = await fromUuid(uuid)
      if (doc) {
        if (event.ctrlKey) {
          const confirmation = await AOVDialog.confirm({
            window: { title: game.i18n.format('AOV.deleteDoc', { type: game.i18n.localize('DOCUMENT.ActiveEffect') }) },
            content: game.i18n.localize('AOV.deleteConfirm') + '<br><strong> ' + game.i18n.localize('DOCUMENT.ActiveEffect') + ': ' + doc.name + '</strong>'
          })
          if (confirmation) {
            await doc.delete()
          }
        } else {
          doc.sheet.render(true)
        }
      }
    }
  }

  /**
   *
   * @param effUuid
   * @param counter
   */
  static async _deleteChange (effUuid, counter) {
    const doc = await fromUuid(effUuid)
    if (doc) {
      let changes = doc.system.changes
      changes.splice(counter, 1)
      await doc.update({ 'system.changes': changes })
    }
    return
  }
}
