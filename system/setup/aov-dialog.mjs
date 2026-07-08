export default class AOVDialog extends foundry.applications.api.DialogV2 {

  static DEFAULT_OPTIONS = {
    classes: ['aov', 'item'],
    position: {
      width: 400,
      height: 'auto',
      top: 200,
      left: 1200,
      zIndex: 500
    }
  }
  /**
   *
   * @param context
   * @param options
   */
  async _postRender (context, options) {
    await super._postRender(context, options)

    const check = this.element.querySelector('#skill-select-form')
    const content = this.element.querySelector('.window-content')
    if (check && content) content.scrollTop = 0
  }
}
