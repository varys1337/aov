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
    html.querySelectorAll('.cardbutton').forEach(b => b.addEventListener('click', AOVCheck.triggerChatButton))
    if (!game.user.isGM) {
      const ownerOnly = html.querySelectorAll('.owner-only')
      for (const zone of ownerOnly) {
        const actor = await AOVactorDetails._getParticipant(zone.dataset.particId, zone.dataset.particType)
        if ((actor && !actor.isOwner) || (!actor && !game.user.isGM)) {
          zone.style.display = 'none'
        }
      }
    }

    const gmVisibleOnly = await html.querySelectorAll('.gm-visible-only')
    for (const elem of gmVisibleOnly) {
      if (!(game.user.isGM)) elem.style.display = 'none'
    }

    return
  }
}
