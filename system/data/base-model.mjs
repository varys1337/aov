export default class AOVDataModel extends foundry.abstract.TypeDataModel {
  /**
   *
   */
  toPlainObject () {
    return { ...this }
  }
}