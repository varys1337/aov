import ChaosiumCanvasInterfaceAmbientLightToggle from './chaosium-canvas-interface-ambient-light-toggle.mjs'
import ChaosiumCanvasInterfaceDrawingToggle from './chaosium-canvas-interface-drawing-toggle.mjs'
import ChaosiumCanvasInterfaceMapPinToggle from './chaosium-canvas-interface-map-pin-toggle.mjs'
import ChaosiumCanvasInterfaceOpenDocument from './chaosium-canvas-interface-open-document.mjs'
import ChaosiumCanvasInterfacePlaySound from './chaosium-canvas-interface-play-sound.mjs'
import ChaosiumCanvasInterfaceToScene from './chaosium-canvas-interface-to-scene.mjs'
import ChaosiumCanvasInterfaceTileToggle from './chaosium-canvas-interface-tile-toggle.mjs'
import ChaosiumCanvasInterface from './chaosium-canvas-interface.mjs'
import { registerClickableRegionTokenLayerAdapter } from './clickable-events-tokenlayer-adapter.mjs'

export default class AOVClickableEvents extends foundry.data.regionBehaviors.RegionBehaviorType {
  /**
   * Set up Clickable Events and Chaosium Canvas Interface
   */
  static initSelf () {
    const known = [
      ChaosiumCanvasInterfaceAmbientLightToggle,
      ChaosiumCanvasInterfaceDrawingToggle,
      ChaosiumCanvasInterfaceMapPinToggle,
      ChaosiumCanvasInterfaceOpenDocument,
      ChaosiumCanvasInterfacePlaySound,
      ChaosiumCanvasInterfaceToScene,
      ChaosiumCanvasInterfaceTileToggle
    ]

    const dataModels = {
      aovClickableEvents: AOVClickableEvents
    }
    const typeIcons = {
      aovClickableEvents: 'fa-solid fa-computer-mouse'
    }
    const types = ['aovClickableEvents']
    for (const CCI of known) {
      const name = new CCI().constructor.name
      dataModels[name] = CCI
      typeIcons[name] = CCI.icon
      types.push(name)
    }

    Object.assign(CONFIG.RegionBehavior.dataModels, dataModels)

    Object.assign(CONFIG.RegionBehavior.typeIcons, typeIcons)

    foundry.applications.apps.DocumentSheetConfig.registerSheet(
      RegionBehavior,
      'AOV',
      foundry.applications.sheets.RegionBehaviorConfig,
      {
        types,
        makeDefault: true
      }
    )

    registerClickableRegionTokenLayerAdapter({
      clickableEventsType: AOVClickableEvents,
      canvasInterfaceType: ChaosiumCanvasInterface
    })
  }

  /**
   * Create Schema
   * @returns {DataSchema}
   */
  static defineSchema () {
    return {
      mouseOver: new foundry.data.fields.JavaScriptField({
        async: true,
        gmOnly: true,
        initial: 'return false',
        label: 'AOV.ClickableEvents.MouseOver.Title',
        hint: 'AOV.ClickableEvents.MouseOver.Hint'
      }),
      leftClick: new foundry.data.fields.JavaScriptField({
        async: true,
        gmOnly: true,
        label: 'AOV.ClickableEvents.LeftClick.Title'
      }),
      rightClick: new foundry.data.fields.JavaScriptField({
        async: true,
        gmOnly: true,
        label: 'AOV.ClickableEvents.RightClick.Title'
      })
    }
  }

  /** @override */
  async _handleMouseOverEvent () {
    try {
      const fn = new foundry.utils.AsyncFunction('scene', 'region', 'behavior', `{${this.mouseOver}\n}`)
      return await fn.call(globalThis, this.scene, this.region, this.behavior)
    } catch (err) {
      console.error(err)
    }
  }

  /** @override */
  async _handleLeftClickEvent () {
    try {
      const fn = new foundry.utils.AsyncFunction('scene', 'region', 'behavior', `{${this.leftClick}\n}`)
      return await fn.call(globalThis, this.scene, this.region, this.behavior)
    } catch (err) {
      console.error(err)
    }
  }

  /** @override */
  async _handleRightClickEvent () {
    try {
      const fn = new foundry.utils.AsyncFunction('scene', 'region', 'behavior', `{${this.rightClick}\n}`)
      return await fn.call(globalThis, this.scene, this.region, this.behavior)
    } catch (err) {
      console.error(err)
    }
  }

  /**
   * Trigger Clickable Event or Chaosium Canvas Interface behavior left click function
   * @param {string} docUuid
   */
  static async ClickRegionLeftUuid (docUuid) {
    await AOVClickableEvents.#clickRegionUuid(docUuid, '_handleLeftClickEvent')
  }

  /**
   * Trigger Clickable Event or Chaosium Canvas Interface behavior right click function
   * @param {string} docUuid
   */
  static async ClickRegionRightUuid (docUuid) {
    await AOVClickableEvents.#clickRegionUuid(docUuid, '_handleRightClickEvent')
  }

  /**
   *
   * @param docUuid
   * @param handlerName
   */
  static async #clickRegionUuid (docUuid, handlerName) {
    const doc = await fromUuid(docUuid)
    if (!doc) {
      console.error('RegionUuid ' + docUuid + ' not loaded')
      return
    }

    const behaviors = (doc.behaviors ?? [])
      .filter((b) => !b.disabled)
      .filter((b) => b.system instanceof AOVClickableEvents || b.system instanceof ChaosiumCanvasInterface)
    await Promise.all(
      behaviors.map(async (b) => {
        if ((await b.system._handleMouseOverEvent()) === true && typeof b.system[handlerName] === 'function') {
          await b.system[handlerName]()
        }
      })
    )
  }

  /**
   * Does the current user have at least observer permission on the document
   * @param {string} documentUuid
   * @returns {boolean}
   */
  static async hasPermissionDocument (documentUuid) {
    const doc = await fromUuid(documentUuid)
    return doc?.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) ?? false
  }

  /**
   * Call from Clickable Event Behavior Macro
   * @param {Event} event
   * @param {string} destinationRegion
   */
  static async InSceneRelativeTeleport (event, destinationRegion) {
    if (event.name === 'tokenMoveIn') {
      // region MUST be the same shape with no transformation
      // Currently only PolygonShapeData and RectangleShapeData
      const sourceTL = event.region.shapes.reduce(
        (c, p) => {
          if (p instanceof foundry.data.PolygonShapeData) {
            for (let i = 0, im = p.points.length; i < im; i = i + 2) {
              if (c[0] === false || p.points[i] < c[0]) {
                c[0] = p.points[i]
              }
              if (c[1] === false || p.points[i + 1] < c[1]) {
                c[1] = p.points[i + 1]
              }
            }
          } else if (p instanceof foundry.data.RectangleShapeData) {
            const x = Math.min(p.x + p.width, p.x)
            const y = Math.min(p.y + p.height, p.y)
            if (c[0] === false || x < c[0]) {
              c[0] = x
            }
            if (c[1] === false || y < c[1]) {
              c[1] = y
            }
          }
          return c
        },
        [false, false]
      )
      const destinationTL = (await fromUuid(destinationRegion)).shapes.reduce(
        (c, p) => {
          if (p instanceof foundry.data.PolygonShapeData) {
            for (let i = 0, im = p.points.length; i < im; i = i + 2) {
              if (c[0] === false || p.points[i] < c[0]) {
                c[0] = p.points[i]
              }
              if (c[1] === false || p.points[i + 1] < c[1]) {
                c[1] = p.points[i + 1]
              }
            }
          } else if (p instanceof foundry.data.RectangleShapeData) {
            const x = Math.min(p.x + p.width, p.x)
            const y = Math.min(p.y + p.height, p.y)
            if (c[0] === false || x < c[0]) {
              c[0] = x
            }
            if (c[1] === false || y < c[1]) {
              c[1] = y
            }
          }
          return c
        },
        [false, false]
      )
      const destinationX = event.data.destination.x - sourceTL[0] + destinationTL[0]
      const destinationY = event.data.destination.y - sourceTL[1] + destinationTL[1]
      await event.data.token.object.stopAnimation() // Panic
      event.data.token.update({ x: destinationX, y: destinationY }, { animate: false })
    }
  }

  /**
   * Map Pin Toggle along with Journal Entry Pages
   * @param {boolean} toggle
   * @param {object} options
   * @param {Array} options.journalPageUuids
   * @param {Array} options.noteUuids
   * @param {int} options.permissionFalse
   * @param {int} options.permissionTrue
   */
  static async MapPinToggle (
    toggle,
    {
      journalPageUuids = [],
      noteUuids = [],
      permissionFalse = CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
      permissionTrue = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
    } = {}
  ) {
    game.socket.emit('system.aov', { type: 'toggleMapNotes', toggle: true })
    game.settings.set('core', NotesLayer.TOGGLE_SETTING, true)
    for (const docUuid of journalPageUuids) {
      const doc = await fromUuid(docUuid)
      if (doc) {
        let permission = permissionTrue
        if (!toggle) {
          permission = permissionFalse
        }
        await doc.update({ 'ownership.default': permission })
      } else {
        console.error('journalPageUuids ' + docUuid + ' not loaded')
      }
    }

    for (const docUuid of noteUuids) {
      const doc = await fromUuid(docUuid)
      if (doc) {
        let texture = 'systems/aov/assets/map-pin.svg'
        if (!toggle) {
          texture = 'systems/aov/assets/map-pin-dark.svg'
        }
        await doc.update({ 'texture.src': texture })
      } else {
        console.error('noteUuids ' + docUuid + ' not loaded')
      }
    }
  }

  /**
   * Option document with optional page and anchor
   * @param {string} documentUuid
   * @param {string|null} pageId
   * @param {string|null} anchor
   */
  static async openDocument (documentUuid, pageId = null, anchor = null) {
    const doc = await fromUuid(documentUuid)
    if (doc?.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)) {
      if (pageId) {
        if (doc.pages.get(pageId)?.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)) {
          doc.sheet.render({ force: true }, { pageId, anchor })
        }
      } else {
        doc.sheet.render({ force: true })
      }
    }
  }

  /**
   * Toggle Tile visibility, Journal Entry permission, and Journal Entry Page permissions
   * @param {boolean} active
   * @param {Array} tileUuids
   * @param {Array} journalUuids
   * @param {Array} pageUuids
   * @param {object} options
   * @param {int} options.pagePermission
   */
  static async toggleTileJournalPages (
    active,
    tileUuids,
    journalUuids,
    pageUuids,
    { pagePermission = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER } = {}
  ) {
    for (const docUuid of tileUuids) {
      const doc = await fromUuid(docUuid)
      if (doc) {
        await doc.update({ hidden: !active })
      } else {
        console.error('Tile ' + docUuid + ' not loaded')
      }
    }
    const permission = !active ? CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE : pagePermission
    for (const docUuid of pageUuids) {
      const doc = await fromUuid(docUuid)
      if (doc) {
        await doc.update({ 'ownership.default': permission })
      } else {
        console.error('Journal Page ' + docUuid + ' not loaded')
      }
    }
    // Do not none / owner journals if any entries do not match
    for (const docUuid of journalUuids) {
      const doc = await fromUuid(docUuid)
      if (doc) {
        if (
          pageUuids.length === 0 ||
          permission === pagePermission ||
          doc.pages.contents.filter((d) => d.ownership.default === pagePermission).length === 0
        ) {
          await doc.update({
            'ownership.default': !active ? CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE : CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
          })
        }
      } else {
        console.error('Journal ' + docUuid + ' not loaded')
      }
    }
  }

  /**
   * View scene
   * @param {string} sceneUuid
   */
  static async toScene (sceneUuid) {
    const doc = await fromUuid(sceneUuid)
    if (doc) {
      setTimeout(() => {
        doc.view()
      }, 100)
    } else {
      console.error('Scene ' + sceneUuid + ' not loaded')
    }
  }
}
