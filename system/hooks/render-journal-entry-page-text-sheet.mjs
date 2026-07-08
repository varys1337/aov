export default function (application, element, context, options) {
  if ((application.document.parent?.getFlag('aov', 'css-adventure-entry') ?? false)) {
    if (!element.classList.contains('css-adventure-entry')) {
      element.classList.add('css-adventure-entry')
    }

    //Force to use themed-light
    if (!element.classList.contains('theme-light')) {
      element.classList.add('themed', 'theme-light')
    }

    element.querySelectorAll('section.tmi-toggleable p.toggle').forEach(toggle => {
      if (toggle.dataset.aovToggleBound === 'true') return
      toggle.dataset.aovToggleBound = 'true'
      const initialSection = toggle.closest('section.tmi-toggleable')?.querySelector('div.toggle')
      if (initialSection && !initialSection.hidden && getComputedStyle(initialSection).display === 'none') {
        initialSection.hidden = true
      }
      toggle.addEventListener('click', () => {
        const section = toggle.closest('section.tmi-toggleable')?.querySelector('div.toggle')
        if (!section) return
        const hidden = section.hidden
        section.hidden = !hidden
        toggle.innerText = hidden ? 'Hide' : 'Reveal'
      })
    })
  }
}
