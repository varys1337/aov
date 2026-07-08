let registered = false
let TokenLayerClass = null
let originalOnClickLeft = null
let originalOnClickRight = null
let clickableBehaviorTypes = []
let hoverSequence = 0

/**
 * Register the AOV clickable-region bridge for TokenLayer clicks.
 *
 * Foundry v14.364 documents TokenLayer but does not document a public hook that
 * preserves this exact empty-canvas left/right click behavior. Keep the private
 * method wrapping isolated here so the risk remains explicit and reversible.
 * @param {object} options
 * @param {typeof foundry.data.regionBehaviors.RegionBehaviorType} options.clickableEventsType
 * @param {typeof foundry.data.regionBehaviors.RegionBehaviorType} options.canvasInterfaceType
 */
export function registerClickableRegionTokenLayerAdapter ({ clickableEventsType, canvasInterfaceType } = {}) {
  if (registered) return
  registered = true

  const TokenLayer = foundry.canvas?.layers?.TokenLayer
  if (!TokenLayer?.prototype?._onClickLeft || !TokenLayer?.prototype?._onClickRight) {
    console.warn('AOV | Clickable region TokenLayer adapter unavailable in this Foundry version.')
    return
  }

  if (!clickableEventsType || !canvasInterfaceType) {
    console.warn('AOV | Clickable region TokenLayer adapter missing behavior types.')
    return
  }

  TokenLayerClass = TokenLayer
  clickableBehaviorTypes = [clickableEventsType, canvasInterfaceType]
  originalOnClickLeft = TokenLayer.prototype._onClickLeft
  originalOnClickRight = TokenLayer.prototype._onClickRight

  TokenLayer.prototype._onClickLeft = function (...args) {
    const result = originalOnClickLeft.apply(this, args)
    void dispatchClickableRegionEvent(args[0], 'left')
    return result
  }

  TokenLayer.prototype._onClickRight = function (...args) {
    const result = originalOnClickRight.apply(this, args)
    void dispatchClickableRegionEvent(args[0], 'right')
    return result
  }

  document.body.addEventListener('mousemove', (event) => {
    void handleMouseMove(event)
  })
}

async function handleMouseMove (event) {
  const sequence = ++hoverSequence
  const setPointer = await dispatchClickableRegionEvent(event, 'hover')
  if (sequence !== hoverSequence) return
  setBoardCursor(setPointer)
}

async function dispatchClickableRegionEvent (event, trigger) {
  if (!isTokenLayerActive()) return false

  const destination = getEventDestination(event)
  if (!destination) return false

  let handled = false
  for (const behavior of getClickableBehaviorsAt(destination)) {
    const mouseOverResult = await behavior.system._handleMouseOverEvent()
    if (mouseOverResult === true) {
      handled = true
      await dispatchBehaviorClick(behavior, trigger)
    } else if (trigger === 'hover' && mouseOverResult !== false) {
      console.error(`${behavior.uuid} did not return a boolean`)
    }
  }
  return handled
}

function dispatchBehaviorClick (behavior, trigger) {
  if (trigger === 'left' && typeof behavior.system._handleLeftClickEvent === 'function') {
    return behavior.system._handleLeftClickEvent()
  }
  if (trigger === 'right' && typeof behavior.system._handleRightClickEvent === 'function') {
    return behavior.system._handleRightClickEvent()
  }
}

function getClickableBehaviorsAt (destination) {
  const regions = canvas?.scene?.regions?.contents
  if (!Array.isArray(regions)) return []

  const levelId = canvas?.level?.id ?? null
  const behaviors = []
  for (const region of regions) {
    if (!regionAppliesToLevel(region, levelId)) continue
    if (!regionContainsPoint(region, destination)) continue

    for (const behavior of region.behaviors ?? []) {
      if (isClickableBehavior(behavior)) behaviors.push(behavior)
    }
  }
  return behaviors
}

function isClickableBehavior (behavior) {
  if (!behavior || behavior.disabled) return false
  return clickableBehaviorTypes.some((BehaviorType) => behavior.system instanceof BehaviorType)
}

function isTokenLayerActive () {
  return Boolean(TokenLayerClass && canvas?.activeLayer instanceof TokenLayerClass)
}

function getEventDestination (event) {
  const activeLayer = canvas?.activeLayer
  if (typeof activeLayer?.toLocal !== 'function') return null
  return activeLayer.toLocal(event)
}

function regionAppliesToLevel (region, levelId) {
  const levels = region?.levels
  if (!levels || levels.size === 0) return true
  if (!levelId || typeof levels.has !== 'function') return false
  return levels.has(levelId)
}

function regionContainsPoint (region, destination) {
  return Boolean(region?.object?.document?.polygonTree?.testPoint?.(destination))
}

function setBoardCursor (setPointer) {
  const board = document.getElementById('board')
  if (!board) return
  board.style.cursor = setPointer ? 'pointer' : ''
}
