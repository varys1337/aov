import AOVDialog from '../setup/aov-dialog.mjs'
import { COCard } from '../chat/combat-chat.mjs'

export class AOVUtilities {

  /**
   *
   * @param s
   */
  static toKebabCase (s) {
    if (!s) {
      return ''
    }
    const match = s.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    if (!match) {
      return ''
    }
    return match.join('-').toLowerCase()
  }

  /**
   *
   * @param text
   */
  static async copyToClipboard (text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999px'
        textArea.style.top = '-999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        return new Promise((resolve, reject) => {
          document.execCommand('copy')
            ? resolve()
            : reject(
              new Error(game.i18n.localize('AOV.UnableToCopyToClipboard'))
            )
          textArea.remove()
        }).catch(err => ui.notifications.error(err))
      }
    } catch (err) {
      ui.notifications.error(game.i18n.localize('AOV.UnableToCopyToClipboard'))
    }
  }


  /**
   *
   * @param string
   */
  static quoteRegExp (string) {
    // https://bitbucket.org/cggaertner/js-hacks/raw/master/quote.js
    const len = string.length
    let qString = ''

    for (let current, i = 0; i < len; ++i) {
      current = string.charAt(i)

      if (current >= ' ' && current <= '~') {
        if (current === '\\' || current === "'") {
          qString += '\\'
        }

        qString += current.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
      } else {
        switch (current) {
          case '\b':
            qString += '\\b'
            break

          case '\f':
            qString += '\\f'
            break

          case '\n':
            qString += '\\n'
            break

          case '\r':
            qString += '\\r'
            break

          case '\t':
            qString += '\\t'
            break

          case '\v':
            qString += '\\v'
            break

          default:
            qString += '\\u'
            current = current.charCodeAt(0).toString(16)
            for (let j = 4; --j >= current.length; qString += '0');
            qString += current
        }
      }
    }
    return qString
  }


  /**
   *
   * @param a
   * @param b
   */
  static sortByNameKey (a, b) {
    return a.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
      .localeCompare(
        b.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase()
      )
  }

  /**
   *
   * @param toggle
   */
  static async toggleDevPhase (toggle) {
    let state = await game.settings.get('aov', 'developmentEnabled')
    await game.settings.set('aov', 'developmentEnabled', !state)
    await game.settings.set('aov', 'createEnabled', false)
    await game.settings.set('aov', 'victoryEnabled', false)
    ui.controls.controls.aovmenu.tools.createphase.active = false
    ui.controls.controls.aovmenu.tools.victoryphase.active = false
    await ui.controls.render()



    ui.notifications.info(
      state
        ? game.i18n.localize('AOV.devPhaseDisabled')
        : game.i18n.localize('AOV.devPhaseEnabled')
    )
    for (let actor of game.actors) {
      if (actor.type != 'character') {continue}
      await actor.update({
        'system.expImprov': !state,
        'system.improv': !state
      })
    }
    game.socket.emit('system.aov', {
      type: 'updateChar'
    })
    AOVUtilities.updateCharSheets(true)
  }

  /**
   *
   * @param toggle
   */
  static async toggleCreate (toggle) {
    let state = await game.settings.get('aov', 'createEnabled')
    await game.settings.set('aov', 'createEnabled', !state)
    await game.settings.set('aov', 'developmentEnabled', false)
    await game.settings.set('aov', 'victoryEnabled', false)
    ui.controls.controls.aovmenu.tools.devphase.active = false
    ui.controls.controls.aovmenu.tools.victoryphase.active = false
    await ui.controls.render()

    ui.notifications.info(
      state
        ? game.i18n.localize('AOV.createDisabled')
        : game.i18n.localize('AOV.createEnabled')
    )
    game.socket.emit('system.aov', {
      type: 'updateCharCreate'
    })
    AOVUtilities.updateCharCreate()
  }

  /**
   *
   * @param toggle
   */
  static async toggleVictory (toggle) {
    let state = await game.settings.get('aov', 'victoryEnabled')
    await game.settings.set('aov', 'victoryEnabled', !state)
    await game.settings.set('aov', 'developmentEnabled', false)
    await game.settings.set('aov', 'createEnabled', false)
    ui.controls.controls.aovmenu.tools.devphase.active = false
    ui.controls.controls.aovmenu.tools.createphase.active = false
    await ui.controls.render()
    ui.notifications.info(
      state
        ? game.i18n.localize('AOV.vicSacrificeDisabled')
        : game.i18n.localize('AOV.vicSacrificeEnabled')
    )
    for (let actor of game.actors) {
      if (actor.type != 'character') {continue}
      await actor.update({
        'system.expImprov': !state,
        'system.improv': !state,
        'system.worship' :!state,
        'system.farming' :!state,
        'system.vadprod' :!state,
        'system.aging' :!state,
        'system.family' :!state
      })
    }
    game.socket.emit('system.aov', {
      type: 'updateChar'
    })
    AOVUtilities.updateCharSheets(true)

    if(state) {
      const confirm = await AOVDialog.confirm({
        window: { title: 'AOV.confirm' },
        content: game.i18n.localize('AOV.increaseYear')
      })
      if (confirm) {
        let year = game.settings.get('aov', 'gameYear') +1
        await game.settings.set('aov', 'gameYear', year)
        ui.notifications.info(game.i18n.format('AOV.yearIncreased', { year: year }))
      }

      let omenTable = (await game.aov.cid.fromCIDBest({ cid: 'rt..omens' }))[0]
      if (!omenTable) {
        ui.notifications.error(game.i18n.format('AOV.ErrorMsg.noTable', { tableCID: 'rt..omens' }))
        return false
      }
      const omenConfirm = await AOVDialog.confirm({
        window: { title: 'AOV.confirm' },
        content: game.i18n.localize('AOV.rollOmens')
      })
      if (omenConfirm) {
        const omenTableResults = await COCard.tableDiceRoll(omenTable)
        let omenResult = await omenTableResults.results[0].name
        let omen = omenResult.toLowerCase().replace('-', '')
        if (['cursed', 'illfavoured', 'normal', 'good', 'blessed'].includes(omen)){
          await game.settings.set('aov', 'omens', omen)
          ui.notifications.info(game.i18n.format('AOV.newOmens', { omen: omenResult }))
        } else {
          ui.notifications.info(game.i18n.format('AOV.ErrorMsg.invalidOmen', { omen: omenResult }))
        }
      }
    }

  }

  /**
   *
   * @param lock
   */
  static updateCharSheets (lock) {
    if (game.user.isGM) {
      for (const a of game.actors.contents) {
        if (a?.type === 'character' && a?.sheet && a?.sheet?.rendered) {
          if (lock) {
            a.update({ 'system.flags.locked': true })
          }
          a.render(false)
        }
      }
    } else {
      for (const a of game.actors.contents) {
        if (a.isOwner) {
          if (lock) {
            a.update({ 'system.flags.locked': true })
          }
          a.render(false)
        }
      }
    }
  }

  /**
   *
   */
  static async updateCharCreate () {
    let state = await game.settings.get('aov', 'createEnabled')
    if (game.user.isGM) {
      for (const a of game.actors.contents) {
        if (a?.type === 'character' && a?.sheet && a?.sheet?.rendered) {
          if (state) {
            a.sheet.tabGroups.primary = 'stats'
          }
          a.render()
        }
      }
    } else {
      for (const a of game.actors.contents) {
        if (a.isOwner && a?.sheet && a?.sheet?.rendered) {
          if (state) {
            a.sheet.tabGroups.primary = 'stats'
          }
          a.render()
        }
      }
    }
  }



  /**
   *
   * @param event
   * @param entityType
   */
  static async getDataFromDropEvent (event, entityType = 'Item') {
    if (event.originalEvent) return []
    try {
      const dataList = JSON.parse(event.dataTransfer.getData('text/plain'))
      if (dataList.type === 'Folder' && dataList.documentName === entityType) {
        const folder = await fromUuid(dataList.uuid)
        if (!folder) return []
        return folder.contents
      } else if (dataList.type === entityType) {
        const item = await fromUuid(dataList.uuid)
        if (!item) return []
        return [item]
      } else {
        return []
      }
    } catch (err) {
      return []
    }
  }

  /**
   *
   * @param toggle
   */
  static async augmentReset (toggle) {
    for (let actr of game.actors) {
      if (!['character', 'npc'].includes(actr.type)) continue
      let updateItems = []
      for (let itm of actr.items) {
        if (!['skill', 'passion'].includes(itm.type)) continue
        if (itm.system.augment) {
          updateItems.push ({ _id: itm._id, 'system.augment': false })
        }
      }
      if (updateItems.length > 0) {
        await Item.updateDocuments(updateItems, { parent: actr })
      }
    }
  }

}
