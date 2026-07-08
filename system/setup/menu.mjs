
import { AOVUtilities } from '../apps/utilities.mjs'
import { AOVCIDActorUpdateItems } from '../cid/cid-actor-update-items.mjs'
import { AOVDamage } from '../apps/damage.mjs'


let AOVMenuLayer

function getAOVMenuLayer () {
  const InteractionLayer = foundry.canvas?.layers?.InteractionLayer
  if (!InteractionLayer) {
    return null
  }

  AOVMenuLayer ??= class AOVMenuLayer extends InteractionLayer {
    /**
     *
     */
    static get layerOptions () {
      return foundry.utils.mergeObject(super.layerOptions, {
        name: 'aovmenu'
      })
    }
  }

  return AOVMenuLayer
}

export class AOVMenu {
  /**
   *
   * @param controls
   */
  static getButtons (controls) {
    const MenuLayer = getAOVMenuLayer()
    if (!MenuLayer) {
      console.warn('AOV | InteractionLayer unavailable; GM tools menu not registered.')
      return
    }

    if (!canvas.aovgmtools) {
      canvas.aovgmtools = new MenuLayer()
    }

    const isGM = game.user.isGM
    const menu = {
      name: 'aovmenu',
      title: 'AOV.gmTools',
      layer: 'aovgmtools',
      icon: 'fas fa-hammer',
      activeTool: 'aovdummy',
      visible: isGM,
      onChange: (event, active) => {
      },
      onToolChange: (event, tool) => {
      },
      tools: {
        aovdummy: {
          icon: '',
          order: 1,
          name: 'aovdummy',
          active: false,
          title: '',
          onChange: () => {
          }
        },
        devphase: {
          toggle: true,
          icon: 'fas fa-angle-double-up',
          order: 4,
          name: 'devphase',
          active: game.settings.get('aov', 'developmentEnabled'),
          title: 'AOV.devPhase',
          onChange: async toggle => await AOVUtilities.toggleDevPhase(toggle)
        },
        'actor-aov-id-best': {
          button: true,
          icon: 'fas fa-fingerprint',
          order: 7,
          name: 'actor-aov-id-best',
          title: 'AOV.ActorCID.ItemsBest',
          onChange: async () => await AOVCIDActorUpdateItems.create()
        },
        createphase: {
          toggle: true,
          icon: 'fas fa-user',
          order: 5,
          name: 'createphase',
          active: game.settings.get('aov', 'createEnabled'),
          title: 'AOV.createPhase',
          onChange: async toggle => await AOVUtilities.toggleCreate(toggle)
        },
        healing: {
          button: true,
          icon: 'fas fa-droplet',
          order: 2,
          name: 'healing',
          title: 'AOV.healingPhase',
          onChange: async toggle => await AOVDamage.healingPhase(toggle)
        },
        augment: {
          button: true,
          icon: 'fas fa-hand-holding-magic',
          order: 3,
          name: 'augment',
          title: 'AOV.augmentReset',
          onChange: async toggle => await AOVUtilities.augmentReset(toggle)
        },
        victoryphase: {
          toggle: true,
          icon: 'fas fa-sun-haze',
          order: 6,
          name: 'victoryphase',
          active: game.settings.get('aov', 'victoryEnabled'),
          title: 'AOV.victoryPhase',
          onChange: async toggle => await AOVUtilities.toggleVictory(toggle)
        }
      }
    }
    if (Array.isArray(controls)) {
      menu.tools = Object.keys(menu.tools).reduce((c, i) => {
        if (i === 'aovdummy') {
          return c
        }
        c.push(menu.tools[i])
        return c
      }, [])
      controls.push(menu)
    } else {
      controls.aovmenu = menu
    }
  }

  /**
   *
   * @param app
   * @param html
   * @param data
   */
  static renderControls (app, html, data) {
    const isGM = game.user.isGM
    const gmMenu = html.querySelector('.fa-solid fa-hammer')?.parentNode
    if (gmMenu && !gmMenu.classList.contains('aovmenu')) {
      gmMenu.classList.add('aovmenu')
      if (isGM) {
        const menuLi = document.createElement('li')
        const menuButton = document.createElement('button')
        menuButton.classList.add('control', 'ui-control', 'tool', 'icon', 'aovmenu')
        menuButton.type = 'button'
      }
    }
  }
}
