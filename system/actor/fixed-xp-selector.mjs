import AOVDialog from '../setup/aov-dialog.mjs'

export class FixedXPDialog extends AOVDialog {

  /**
   *
   * @param context
   * @param _options
   */
  _onRender (context, _options) {
    this.element.querySelectorAll('.select.rollable').forEach(n => n.addEventListener('click', this._onSelectClicked.bind(this)))
  }

  /**
   *
   * @param event
   */
  async _onSelectClicked (event) {
    const chosen = event.currentTarget.closest('.mediumIcon')
    let choice = chosen.dataset.set

    //Update points spent and the stats value on the form
    const form = event.currentTarget.closest('.skill-select')
    const selected = form.querySelector('.item-' + choice)
    if (this.options.data.selectOptions[choice].selected) {
      this.options.data.selectOptions[choice].selected = false
      selected.innerHTML = '<a><i class="fa-regular fa-square"></i> </a>'
    } else {
      this.options.data.selectOptions[choice].selected = true
      selected.innerHTML = '<a><i class="fa-regular fa-square-check"></i> </a>'
    }
  }



  /**
   *
   * @param selectOptions
   */
  static async create (selectOptions) {
    let destination = 'systems/aov/templates/dialog/fixedXP.hbs'
    let winTitle = game.i18n.localize('AOV.fixedXP')
    let data = {
      selectOptions
    }
    const html = await foundry.applications.handlebars.renderTemplate(destination, data)

    return new Promise(resolve => {
      const dlg = FixedXPDialog.wait(
        {
          window: { title: winTitle },
          title: winTitle,
          content: html,
          data,
          buttons: [{
            label: game.i18n.localize('AOV.confirm'),
            callback: (event, button, dialog) => {
              const selected = dialog.options.data.selectOptions.filter(option => (option.selected))
              return resolve(selected)
            }
          }]
        }
      )

    })
    return dlg
  }
}

