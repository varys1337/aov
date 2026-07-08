export default function (application, element, context, options) {
  // Add predefined keys
  const tab = element.querySelector('section[data-tab="changes"]')
  if (!tab) return

  if (!tab.querySelector('[data-aov-predefined-keys]')) {
    const div = document.createElement('div')
    div.classList.add('form-group')
    div.dataset.aovPredefinedKeys = 'true'
    const label = document.createElement('label')
    label.for = application.id + '-predefinedKeys'
    label.innerText = game.i18n.localize('AOV.predefinedActiveEffectKeys')
    div.append(label)
    const div2 = document.createElement('div')
    div2.classList.add('form-fields')
    const select = document.createElement('select')
    select.id = label.for
    const option = document.createElement('option')
    option.value = ''
    option.text = ''
    select.append(option)
    for (const key in CONFIG.AOV.keysActiveEffects) {
      const option = document.createElement('option')
      option.value = key
      option.text = game.i18n.localize(CONFIG.AOV.keysActiveEffects[key])
      select.append(option)
    }
    select.addEventListener('change', async (event) => {
      event.preventDefault()
      const key = event.currentTarget.value
      event.currentTarget.value = ''
      if (!key) return

      const changes = getSubmittedChanges(application)
      const initial = getInitialChange(application.document, key, changes)
      if (!initial) return

      changes.push(initial)
      return application.submit({
        updateData: {
          system: {
            changes
          }
        }
      })
    })
    div2.append(select)
    div.append(div2)
    const p = document.createElement('p')
    p.classList.add('hint')
    p.innerText = game.i18n.localize('AOV.predefinedActiveEffectKeyHint')
    div.append(p)
    tab.prepend(div)
  }

  // Tooltip predefined keys
  const inputs = tab.querySelectorAll('div.key input')
  for (const input of inputs) {
    if (typeof CONFIG.AOV.keysActiveEffects[input.value] !== 'undefined') {
      input.dataset.tooltip = CONFIG.AOV.keysActiveEffects[input.value]
    }
  }
}

function getSubmittedChanges (application) {
  const form = application.form
  if (form) {
    const formData = new foundry.applications.ux.FormDataExtended(form)
    const submitData = foundry.utils.expandObject(formData.object)
    return Object.values(submitData.system?.changes ?? {}).map(cloneChange)
  }
  return (application.document.system?.changes ?? []).map(cloneChange)
}

function getInitialChange (document, key, changes) {
  const effectClass = document.constructor
  const changeTypes = effectClass.CHANGE_TYPES ?? {}
  const changePhases = effectClass.CHANGE_PHASES ?? {}
  const type = getDefaultChangeType(changeTypes)
  const phase = changes.find(change => change.phase)?.phase ?? getDefaultChangePhase(changePhases)
  if (!type || !phase) return null

  return {
    key,
    phase,
    priority: changeTypes[type]?.priority ?? changeTypes[type]?.defaultPriority ?? null,
    type,
    value: ''
  }
}

function getDefaultChangeType (changeTypes) {
  const typeKeys = Object.keys(changeTypes)
  return typeKeys.find(key => key.toLowerCase() === 'add') ?? typeKeys[0]
}

function getDefaultChangePhase (changePhases) {
  return Object.keys(changePhases)[0]
}

function cloneChange (change) {
  if (typeof change?.toObject === 'function') return change.toObject()
  return {
    key: change?.key ?? '',
    phase: change?.phase,
    priority: change?.priority ?? null,
    type: change?.type,
    value: change?.value ?? ''
  }
}
