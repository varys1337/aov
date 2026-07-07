export class AoVCombatant extends Combatant {

  /**
   *
   * @param data
   * @param options
   * @param userID
   */
  async _onCreate (data, options, userID) {
    super._onCreate(data, options, userID)
    //Don't use token images for combatants as they are too small.  Use actor images
    if (game.settings.get('aov', 'combatToken')) {
      let parent = await fromUuid('Actor.'+this.actorId)
      if (game.user.isGM) {
        AoVCombatant.updateImage( this.uuid, parent.img)
      } else {
        const availableGM = game.users.find(d => d.active && d.isGM)?.id
        if (availableGM) {
          game.socket.emit('system.aov', {
            type: 'combatantImage',
            to: availableGM,
            value: { combatantUuid:this.uuid, img: parent.img }
          })
        } else {
          ui.notifications.warn(game.i18n.localize('AOV.noAvailableGM'))
        }
      }
    }
  }


  /**
   *
   * @param combatantUuid
   * @param value
   */
  static async updateImage (combatantUuid, value) {
    if (game.user.isGM) {
      let combatant = await fromUuid(combatantUuid)
      await combatant.update({ 'img': value })
    }
  }


}
