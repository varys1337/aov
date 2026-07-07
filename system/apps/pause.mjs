export class AOVPause extends foundry.applications.ui.GamePause {
  /**
   *
   * @param _options
   */
  async _prepareContext (_options) {
    const context = await super._prepareContext(_options)
    context.icon = 'systems/aov/art-assets/pause_shield.webp'
    return context
  }
}
