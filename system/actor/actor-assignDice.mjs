import AOVDialog from '../setup/aov-dialog.mjs'

export class AssignDiceDialog extends AOVDialog {

  /**
   *
   * @param context
   * @param _options
   */
  _onRender (context, _options) {
    this.element.querySelectorAll('.rollable').forEach(n => n.addEventListener('click', this._onSelectClicked.bind(this)))
  }

  /**
   *
   * @param event
   */
  async _onSelectClicked (event) {
    const chosen = event.currentTarget
    const form = event.currentTarget.closest('.assign-dice')
    let die = chosen.dataset.set
    let choice = chosen.dataset.stat

    let used = await (this.options.data.dice).filter(itm => itm.pick === choice)
    if (used.length >= this.options.data.results[choice].numDic) {
      const newTarget = form.querySelector('.none-'+die)
      newTarget.checked = true
      return}

    this.options.data.dice[die].pick = choice
    let count = 0
    let stats = {
      str: 0,
      con: 0,
      siz: 0,
      dex: 0,
      int: 0,
      pow: 0,
      cha: 0
    }
    for (let temp of this.options.data.dice) {
      if (temp.pick != 'none') {
        count=count+1
        stats[temp.pick] = stats[temp.pick] + temp.value
      }
    }
    this.options.data.added = count

    //Display updated stat totals
    //const form = event.currentTarget.closest('.assign-dice')
    const str = form.querySelector('.str')
    str.innerText = stats.str+this.options.data.results.str.adjVal
    const con = form.querySelector('.con')
    con.innerText = stats.con+this.options.data.results.con.adjVal
    const siz = form.querySelector('.siz')
    siz.innerText = stats.siz+this.options.data.results.siz.adjVal
    const dex = form.querySelector('.dex')
    dex.innerText = stats.dex+this.options.data.results.dex.adjVal
    const int = form.querySelector('.int')
    int.innerText = stats.int+this.options.data.results.int.adjVal
    const pow = form.querySelector('.pow')
    pow.innerText = stats.pow+this.options.data.results.pow.adjVal
    const cha = form.querySelector('.cha')
    cha.innerText = stats.cha+this.options.data.results.cha.adjVal
  }


  /**
   *
   * @param dice
   * @param picks
   * @param results
   */
  static async create (dice, picks, results) {
    let destination = 'systems/aov/templates/dialog/assignDice.hbs'
    let winTitle = game.i18n.localize('AOV.assignDice')
    let data = {
      dice,
      added: 0,
      picks,
      results
    }
    const html = await foundry.applications.handlebars.renderTemplate(destination, data)

    return new Promise(resolve => {
      const dlg = AssignDiceDialog.wait(
        {
          window: { title: winTitle },
          form: { closeOnSubmit: false },
          title: winTitle,
          content: html,
          data,
          buttons:[{
            label: game.i18n.localize('AOV.confirm'),
            callback: (event, button, dialog) => {
              if (dialog.options.data.added < dialog.options.data.picks) {
                button.disabled = true
              } else {
                dialog.options.form.closeOnSubmit = true
                const selected = dialog.options.data.dice
                return resolve(selected)
              }
            }
          }]
        }
      )

    })
    return dlg
  }
}

