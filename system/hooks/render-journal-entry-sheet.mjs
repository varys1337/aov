import { insertCIDFrameButton } from '../cid/cid-button.mjs'

const BOOKMARK_ASSET_PATH = 'systems/aov/art-assets/ribbon-yellow.svg'
const SHORT_BOOKMARK_ASSET_PATH = 'systems/aov/art-assets/ribbon-red.svg'

export default function (application, element, context, options) {
  insertCIDFrameButton(application, element)


  if ((application.document.getFlag('aov', 'css-adventure-entry') ?? false)) {
    if (!element.classList.contains('css-adventure-entry')) {
      element.classList.add('css-adventure-entry')
    }
    //Force to use themed-light
    if (!element.classList.contains('theme-light')) {
      element.classList.add('themed', 'theme-light')
    }


    if ((application.document.getFlag('aov', 'fixed-adventure-heading') ?? false)) {
      element.classList.add('fixed-adventure-heading')
      //Force to use themed-light
      if (!element.classList.contains('theme-light')) {
        element.classList.add('themed', 'theme-light')
      }

      if (element.querySelector('.adventure-heading-section')) return

      if (typeof application.document.pages?.contents?.[0]?.id === 'string') {
        const subheading = application.document.pages.get(application.document.pages.contents[0].id)?.flags?.aov?.['fixed-adventure-subheading'] ?? ''
        if (subheading !== '') {
          element.classList.add('fixed-adventure-subheading')
          const short = subheading.trim().length === 0
          const heading = createAdventureHeading(element.ownerDocument, {
            title: application.title,
            subheading,
            short
          })
          element.querySelector('article.journal-entry-page')?.before(heading)
        }
      }
    }
  }
}

function createAdventureHeading (document, { title, subheading, short }) {
  const wrapper = document.createElement('div')
  wrapper.classList.add('adventure-heading-section', 'flexrow-pen')

  const bookmark = document.createElement('div')
  bookmark.classList.add('bookmark')
  if (short) bookmark.classList.add('short')

  const image = document.createElement('img')
  image.src = short ? SHORT_BOOKMARK_ASSET_PATH : BOOKMARK_ASSET_PATH
  bookmark.append(image)

  const heading = document.createElement('div')
  heading.classList.add('adventure-heading')

  const headingText = document.createElement('div')
  headingText.classList.add('heading')
  headingText.textContent = title ?? ''
  heading.append(headingText)

  if (!short) {
    const subheadingText = document.createElement('div')
    subheadingText.classList.add('subheading')
    subheadingText.textContent = subheading ?? ''
    heading.append(subheadingText)
  }

  wrapper.append(bookmark, heading)
  return wrapper
}
