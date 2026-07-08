import { AOVactorDetails } from '../apps/actor-details.mjs'
import { AOVCheck } from '../apps/checks.mjs'
import { RECard } from './resistance-chat.mjs'


export class AOVChat{

  //Hides Owner-Only sections of chat message from anyone other than the owner and the GM
  /**
   *
   * @param message
   * @param html
   */
  static async renderMessageHook (message, html) {
    ui.chat.scrollBottom()
    AOVChat.#bindCardButtons(html)

    const ownerOnly = html.querySelectorAll('.owner-only')
    const gmVisibleOnly = html.querySelectorAll('.gm-visible-only')
    AOVChat.#hideVisibilityZones(ownerOnly)
    if (!game.user.isGM) AOVChat.#hideVisibilityZones(gmVisibleOnly)

    if (game.user.isGM) {
      AOVChat.#showVisibilityZones(ownerOnly)
      AOVChat.#showVisibilityZones(gmVisibleOnly)
      return
    }

    for (const zone of ownerOnly) {
      const actor = await AOVactorDetails._getParticipant(zone.dataset.particId, zone.dataset.particType)
      if (actor?.isOwner) AOVChat.#showVisibilityZones([zone])
    }
  }

  /**
   *
   * @param html
   */
  static #bindCardButtons (html) {
    for (const button of html.querySelectorAll('.cardbutton')) {
      if (button.dataset.aovBound === 'true') continue
      button.dataset.aovBound = 'true'
      button.addEventListener('click', AOVCheck.triggerChatButton)
    }
  }

  /**
   *
   * @param zones
   */
  static #hideVisibilityZones (zones) {
    for (const zone of zones) {
      zone.hidden = true
      delete zone.dataset.aovVisible
      zone.dataset.aovPendingVisibility = 'true'
    }
  }

  /**
   *
   * @param zones
   */
  static #showVisibilityZones (zones) {
    for (const zone of zones) {
      zone.dataset.aovVisible = 'true'
      zone.hidden = false
      delete zone.dataset.aovPendingVisibility
    }
  }
}
