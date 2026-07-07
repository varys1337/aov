export default class ChaosiumCanvasInterface extends foundry.data.regionBehaviors.RegionBehaviorType {
  /**
   *
   */
  static get actionToggles () {
    return {
      [ChaosiumCanvasInterface.actionToggle.On]: 'AOV.ChaosiumCanvasInterface.Actions.Show',
      [ChaosiumCanvasInterface.actionToggle.Off]: 'AOV.ChaosiumCanvasInterface.Actions.Hide',
      [ChaosiumCanvasInterface.actionToggle.Toggle]: 'AOV.ChaosiumCanvasInterface.Actions.Toggle'
    }
  }

  /**
   *
   */
  static get actionToggle () {
    return {
      Off: 0,
      On: 1,
      Toggle: 2
    }
  }

  /**
   *
   */
  static get triggerButtons () {
    return {
      [ChaosiumCanvasInterface.triggerButton.Left]: 'AOV.ChaosiumCanvasInterface.Buttons.Left',
      [ChaosiumCanvasInterface.triggerButton.Right]: 'AOV.ChaosiumCanvasInterface.Buttons.Right'
    }
  }

  /**
   *
   */
  static get triggerButton () {
    return {
      Left: 0,
      Right: 2
    }
  }
}
