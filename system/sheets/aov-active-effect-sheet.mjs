import { AOVActiveEffect } from "../apps/active-effects.mjs"

export class AOVActiveEffectSheet {
  static getItemEffectsFromSheet(document) {
    let thisDocument = document.effects.reduce((c, i) => {
      c.push({
        uuid: i.uuid,
        name: i.name
      })
      return c
    }, [])
    return (document.items ?? []).reduce((c, i) => {
      for (const effect of i.effects) {
        c.push({
          uuid: effect.uuid,
          name: effect.name
        })
      }
      return c
    }, thisDocument)
  }

  static getAutoEffect(document) {
    return {
      effect: document.effects.find(e => e.flags.aov?.autoActiveEffect ?? false),
      document: document
    }
  }

  static getEffectChangesFromSheet(document) {
    const effectChanges = []
    const effectKeys = foundry.utils.duplicate(CONFIG.AOV.keysActiveEffects)
    const effectData = AOVActiveEffectSheet.getAutoEffect(document)
    if (effectData.effect) {
      for (const change of effectData.effect.changes) {
        if (change.type === 'add') {
          effectChanges.push({
            key: change.key,
            name: effectKeys[change.key] ?? change.key,
            negative: (change.value < 0),
            value: Math.abs(change.value)
          })
          delete effectKeys[change.key]
        }
      }
    }
    return {
      effectKeys,
      effectChanges
    }
  }

  static async getActorEffectsFromSheet(document) {
    const effectKeys = foundry.utils.duplicate(CONFIG.AOV.keysActiveEffects)
    let aEffects = this.getItemEffectsFromSheet(document)
    let effects = []
    for (let eff of aEffects) {
      let aovAE = await fromUuid(eff.uuid)
      if (aovAE) {
        const container = (aovAE.parent.parent instanceof Item ? aovAE.parent.parent : aovAE.parent instanceof Item ? aovAE.parent : aovAE)
        for (let chng of aovAE.changes) {
          effects.push({
            id: container.id,
            sourceName: container.name,
            key: chng.key,
            name: game.i18n.localize((effectKeys[chng.key] ?? chng.key)),
            value: chng.value,
            isActive: aovAE.active ?? false
          })
        }
      }
    }
    return effects
  }

  static activateListeners(document) {
    if (game.user.isGM) {
      document.element.querySelectorAll('div[data-action="openActiveEffect"]').forEach(n => n.addEventListener("click", AOVActiveEffectSheet._onOpenActiveEffect.bind(document)))
      document.element.querySelectorAll('div[data-action="addItemEffect"]').forEach(n => n.addEventListener("click", AOVActiveEffectSheet._onAddItemEffect.bind(document)))
      document.element.querySelectorAll('div.active-effect-change-edit .fa-trash').forEach(n => n.addEventListener("click", AOVActiveEffectSheet._onDeleteItemEffectChange.bind(document)))
      document.element.querySelectorAll('div.active-effect-change-edit select').forEach(n => n.addEventListener("click", AOVActiveEffectSheet._onChangeItemEffectChange.bind(document)))
      document.element.querySelectorAll('div.active-effect-change-edit input').forEach(n => n.addEventListener("blur", AOVActiveEffectSheet._onChangeItemEffectChange.bind(document)))
    }
  }

  static async _onAddItemEffect(event) {
    if (typeof event.currentTarget.dataset.key === 'string') {
      const effectData = AOVActiveEffectSheet.getAutoEffect(this.document)
      const newChange = {
        key: event.currentTarget.dataset.key,
        mode: CONST.ACTIVE_EFFECT_CHANGE_TYPES.ADD,
        value: 0
      }
      if (effectData.effect) {
        const changes = foundry.utils.duplicate(effectData.effect.changes)
        changes.push(newChange)
        await effectData.document.updateEmbeddedDocuments('ActiveEffect', [{
          _id: effectData.effect.id,
          changes: changes
        }])
      } else {
        const newDoc = {
          'flags.aov.autoActiveEffect': true,
          name: effectData.document.name,
          changes: [
            newChange
          ],
        }
        if (this.document.parent) {
          newDoc.origin = this.document.uuid
        }
        await effectData.document.createEmbeddedDocuments('ActiveEffect', [newDoc])
      }
      this.render(true)
    }
  }

  static async _onDeleteItemEffectChange(event) {
    const key = event.currentTarget.closest('div.active-effect-change-edit')?.dataset?.key
    if (typeof key === 'string') {
      const effectData = AOVActiveEffectSheet.getAutoEffect(this.document)
      if (effectData.effect) {
        const changes = foundry.utils.duplicate(effectData.effect.changes).filter(c => c.key !== key)
        if (changes.length) {
          await effectData.document.updateEmbeddedDocuments('ActiveEffect', [{
            _id: effectData.effect.id,
            changes: changes
          }])
        } else {
          await effectData.document.deleteEmbeddedDocuments('ActiveEffect', [
            effectData.effect.id,
          ])
        }
        this.render(true)
      }
    }
  }

  static async _onChangeItemEffectChange(event) {
    const outer = event.currentTarget.closest('div.active-effect-change-edit')
    const key = outer?.dataset?.key
    if (typeof key === 'string') {
      const effectData = AOVActiveEffectSheet.getAutoEffect(this.document)
      if (effectData.effect) {
        const changes = foundry.utils.duplicate(effectData.effect.changes)
        const index = changes.findIndex(c => c.key === key)
        if (index > -1) {
          const value = parseInt(outer.querySelector('select').value + outer.querySelector('input').value, 10)
          changes[index].value = value
          await effectData.document.updateEmbeddedDocuments('ActiveEffect', [{
            _id: effectData.effect.id,
            changes: changes
          }])
        }
      }
    }
  }

  static async _onOpenActiveEffect(event) {
    const uuid = event.currentTarget.dataset.uuid
    if (uuid) {
      (await fromUuid(uuid))?.sheet.render(true)
    }
  }
}
