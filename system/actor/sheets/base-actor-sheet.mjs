const { api, sheets } = foundry.applications;
import { CIDEditor } from "../../cid/cid-editor.mjs";
import { AOVActorItemDrop } from "../actor-item-drop.mjs";
import { AOVActor } from "../actor.mjs";
import { AOVRollType } from "../../apps/roll-types.mjs";
import { AOVCheck } from "../../apps/checks.mjs";
import AOVDialog from "../../setup/aov-dialog.mjs"
import { COCard } from "../../chat/combat-chat.mjs";
import { AOVCharCreate } from "../charCreate.mjs";
import { AOVCharDevelop } from "../charDevelop.mjs";

export class AoVActorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  constructor(options = {}) {
    super(options);
    this._dragDrop = this._createDragDropHandlers();
  }

  static DEFAULT_OPTIONS = {
    classes: ['aov', 'sheet', 'actor'],
    position: {
      width: 587,
      height: 800
    },
    window: {
      resizable: true,
    },
    tag: "form",
    dragDrop: [{ dragSelector: '[data-drag]', dropSelector: null }],
    form: {
      submitOnChange: true,
    },
    actions: {
      onEditImage: this._onEditImage,
      editCid: this._onEditCid,
      viewDoc: this._viewDoc,
      toggleActor: this._toggleActor,
      createDoc: this._createDoc,
      deleteDoc: this._deleteDoc,
      itemToggle: this._itemToggle,
      randomStats: this._randomStats,
      averageStats: this._averageStats,
      recalc: this._recalcBase,
      diceroll: this._diceroll,
      dodge: this._dodge,
      resetSpecies: this._resetSpecies,
      resetHomeland: this._resetHomeland,
      rollName: this._rollName,
      rollStats: this._rollStats,
      rollPersonality: this._rollPersonality,
      persSkills: this._persSkills,
      devotions: this._devotions,
      family: this._family,
      farm: this._farm,
      weapons: this._weapons,
      features:this._features,
      history: this._history,
      resethistory: this._resethistory,
      experience: this._expRoll,
      training: this._trainingRoll,
      research: this._researchRoll,
      statimp: this._statImpRoll,
      worship: this._worship,
      farming: this._farming,
      vadprod: this._vadprod,
      aging: this._aging,
      familyroll: this._familyroll,
      npcSections: this._npcSections,
      addWound: this._addWound,
      openWiki: this._openWiki,
      wyrd: this._spendWyrd,
      detach: this._myDetach,
    }
  }



  //Add CID Editor Button as seperate icon on the Window header
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    //define CID button
    const sheetCID = this.actor.flags?.aov?.cidFlag;
    const noId = (typeof sheetCID === 'undefined' || typeof sheetCID.id === 'undefined' || sheetCID.id === '');
    //add button
    const label = game.i18n.localize("AOV.CIDFlag.id");
    const cidEditor = `<button type="button" class="header-control icon fa-solid fa-fingerprint ${noId ? 'edit-cid-warning' : 'edit-cid-exisiting'}"
        data-action="editCid" data-tooltip="${label}" aria-label="${label}"></button>`;
    let el = this.window.close;
    while (el.previousElementSibling.localName === 'button') {
      el = el.previousElementSibling;
    }
    el.insertAdjacentHTML("beforebegin", cidEditor);
    return frame;
  }


  async _prepareContext(options) {
    return {
      editable: this.isEditable,
      owner: this.document.isOwner,
      limited: this.document.limited,
      actor: this.actor,
      flags: this.actor.flags,
      isGM: game.user.isGM,
      fields: this.document.schema.fields,
      config: CONFIG.AOV,
      system: this.actor.system,
      isLocked: this.actor.system.locked,
      isLinked: this.actor.prototypeToken?.actorLink === true,
      isSynth: this.actor.isToken,
      singleColour: game.settings.get('aov','singleColourBar'),
      isDevelop: game.settings.get('aov','developmentEnabled'),
      isCreate: game.settings.get('aov','createEnabled'),
      isVictory: game.settings.get('aov','victoryEnabled'),
      isSelectGender: game.settings.get('aov','binaryGender'),
      showLogo: game.settings.get('aov','showLogo'),
    };
  }


  //------------ACTIONS-------------------

  static async _myDetach (event, target) {
    if (this.actor.type === "npc") {
      if (!this.actor.systemnoteView) {
        await this.actor.update({'system.noteView' : true});
        this.render["notes"]
      }
    }
    let myWin= await this.detachWindow()
  }

  // Change Image
  static async _onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const { img } = this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ??
      {};
    const fp = new foundry.applications.apps.FilePicker({
      current,
      type: 'image',
      redirectToRoot: img ? [img] : [],
      callback: (path) => {
        this.document.update({ [attr]: path });
      },
      top: this.position.top + 39,
      left: this.position.left + 9,
    });
    return fp.browse();
  }

  // Handle editCid action
  static _onEditCid(event) {
    event.stopPropagation(); // Don't trigger other events
    if (event.detail > 1) return; // Ignore repeated clicks
    new CIDEditor({ document: this.document }, {}).render(true, { focus: true })
  }

  // View Embedded Document
  static async _viewDoc(event, target) {
    const doc = this._getEmbeddedDocument(target);
    if(!doc) {return}
    let preventDel = target.dataset.preventdel ?? 'false'
    if (event.ctrlKey && preventDel !='true') {
      if (['armour','devotion','family','gear','history','npcpower','passion','rune','runescript','seidur','skill','weapon'].includes(doc.type)) {
          const confirmation = await AOVDialog.confirm({
            window: { title: game.i18n.format("AOV.deleteDoc", {type: game.i18n.localize('TYPES.Item.'+doc.type)}) },

            content: game.i18n.localize("AOV.deleteConfirm") + "<br><strong> " + game.i18n.localize('TYPES.Item.'+doc.type) +": " + doc.name + "</strong>"
          })
          if (confirmation) {
            await doc.delete();
          }
          return
        }
    } else {
      doc.sheet.render(true);
    }
  }

  static async _deleteDoc(event, target) {
    if (event.detail === 2) {  //Only perform on double click
      const doc = this._getEmbeddedDocument(target);
      await doc.delete();
    }
  }

  //Get Embedded Document
  _getEmbeddedDocument(target) {
    const docRow = target.closest('li[data-document-class]');
    if (docRow.dataset.documentClass === 'Item') {
      return this.actor.items.get(docRow.dataset.itemId);
    } else if (docRow.dataset.documentClass === 'ActiveEffect') {
      const parent =
        docRow.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(docRow?.dataset.parentId);
      return parent.effects.get(docRow?.dataset.effectId);
    } else return console.warn('Could not find document class');
  }

  //Toggle aspects of the actor
  static _toggleActor(event,target) {
    event.stopPropagation();
    let checkProp={}
    let prop = target.dataset.property
    if (['locked', 'uncommon', 'alphaSkills','showRunes','beserkerOpt','beserkerStat','hitlocView','skillView','weaponView','powerView','equipView','passionView','devotionView','quickstart'].includes(prop)) {
      checkProp = { [`system.${prop}`]: !this.actor.system[prop] }
    } else {
      return
    }
    this.actor.update(checkProp)
  }


  //Toggle an item
  static _itemToggle(event, target) {
    event.stopImmediatePropagation();
    let checkProp = {};
    const prop = target.dataset.property;
    const itemId = target.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (['xpCheck',"treated","prepared","depend",'augment'].includes(prop)) {
      checkProp = { [`system.${prop}`]: !item.system[prop] }
    } else if (prop === 'equipStatus') {
      let newVal = item.system.equipStatus + 1
      if (newVal > 3) { newVal = 1 }
      checkProp = { 'system.equipStatus': newVal }
    } else { return }
    item.update(checkProp);
  }

  //Create an Embedded Document
  static async _createDoc(event, target) {
    const docCls = getDocumentClass(target.dataset.documentClass);
    const docData = {
      name: docCls.defaultName({
        type: target.dataset.type,
        parent: this.actor,
      }),
    };
    // Loop through the dataset and add it to our docData
    for (const [dataKey, value] of Object.entries(target.dataset)) {
      // Ignore data attributes that are reserved for action handling
      if (['action', 'documentClass'].includes(dataKey)) continue;
      foundry.utils.setProperty(docData, dataKey, value);
    }
    // Create the embedded document
    const newItem = await docCls.create(docData, { parent: this.actor });

    //And in certain circumstances render the new item sheet
    if (['gear','wound','family','thrall'].includes(newItem.type)) {
      newItem.sheet.render(true);
    }

    //Add default CID to the item
    if (game.settings.get('aov', "actorItemCID")) {
      let key = await game.aov.cid.guessId(newItem)
      await newItem.update({
        'flags.aov.cidFlag.id': key,
        'flags.aov.cidFlag.lang': game.i18n.lang,
        'flags.aov.cidFlag.priority': 0
      })
      const html = $(newItem.sheet.element).find('header.window-header .edit-cid-warning,header.window-header .edit-cid-exisiting')
      if (html.length) {
        html.css({
          color: (key ? 'orange' : 'red')
        })
      }
      newItem.sheet.render();
    }
  }

  //Roll Random Stats
  static async _randomStats(event, target){
    await this.actor.rollCharacteristicsValue()
  }

  //Roll Average Stats
  static async _averageStats(event, target){
    await this.actor.averageCharacteristicsValue()
  }

  //Recalc Base Skill Scores
  static async _recalcBase() {
    if (this.actor.type !='character') {return}
    let skillList = await this.actor.items.filter(itm=>itm.type ==='skill').filter(nItm=> nItm.system.baseVal !='fixed')
      for (let skill of skillList) {
        let base = await AOVActorItemDrop._AOVcalcBase(skill, this.actor);
        await skill.update({'system.base': base})
      }
    }

  //Dice Check
  static async _diceroll(event,target) {
    await AOVRollType._onDetermineCheck(event, target.dataset, this.document)
  }

  //Dodge - add Dodge roll to Combat
  static async _dodge(event,target) {
    let skillId = this.actor.items.filter(i=>i.flags.aov?.cidFlag?.id === 'i.skill.dodge')
    if (!skillId || skillId.length<1) {
      ui.notifications.warn(game.i18n.localize('AOV.card.noDodge'))
      return
    }
          AOVCheck._trigger({
              rollType: "SK",
              cardType: "CO",
              shiftKey: false,
              skillId: skillId[0]._id,
              itemId: skillId[0]._id,
              event,
              actor: this.actor,
              characteristic: false
          })
  }

  //Reset Species
  static async _resetSpecies(event, target) {
    if (event.detail === 2) {  //Only perform on double click
      AOVCharCreate.resetSpecies(target, this.actor)
    }
  }

  //Reset Homeland
  static async _resetHomeland(event, target) {
    if (event.detail === 2) {  //Only perform on double click
      AOVCharCreate.resetHomeland(target, this.actor)
    }
  }

  //Roll Character Name
  static async _rollName (event, target) {
    AOVCharCreate.characName (this.actor, target)
  }

  //Roll Stats for Character
  static async _rollStats (event, target) {
    let type = target.dataset.type
    switch (type) {
      case 'random':
        AOVCharCreate.rollRandom (this.actor)
        break
      case 'assign':
        AOVCharCreate.assignRandom (this.actor)
        break
      case 'points':
        AOVCharCreate.usePoints (this.actor)
        break
    }
    await this._recalcBase
    return
  }

  //Roll Personality
  static async _rollPersonality(event, target) {
    AOVCharCreate.rollPersonality(this.actor)
  }

  //Select Personal Skills
  static async _persSkills (event, target) {
    AOVCharCreate.persSkills(this.actor)
  }

  //Select Devotions
  static async _devotions (event, target) {
    AOVCharCreate.devotions(this.actor)
  }

  //Create Family
  static async _family (event, target) {
    AOVCharCreate.family(this.actor)
  }

  //Create Farm
  static async _farm (event, target) {
    if (game.user.isGM) {
      AOVCharCreate.farm(this.actor)
    } else {
      let actor = this.actor
      const availableGM = game.users.find(d => d.active && d.isGM)?.id
      if (availableGM) {
        game.socket.emit('system.aov', {
          type: 'createFarm',
          to: availableGM,
          value: { actor }
        })
      } else {
        ui.notifications.warn(game.i18n.localize('AOV.noAvailableGM'))
      }
    }
  }

  //Choose Weapons
  static async _weapons(event, target) {
    AOVCharCreate.selectWeapons(this.actor)
  }

  //Roll Distinctive Features
  static async _features (event,target) {
    AOVCharCreate.features(this.actor)
  }

  //Roll Family History
  static async _history (event,target) {
    AOVCharCreate.history(this.actor)
  }

  //Reset Family History
  static async _resethistory (event,target) {
    if (event.detail === 2) {  //Only perform on double click
      const confirm = await AOVDialog.confirm({
        window: { title: game.i18n.localize('AOV.confirm') },
        content: game.i18n.localize('AOV.eraseHistory')
      })
      if (confirm) {
        AOVCharCreate.resetHistory(this.actor)
      }
    }
  }

  //Experience Rolls
  static async _expRoll (event, target) {
    if (this.actor.system.expImprov) {
      AOVCharDevelop.expRolls(this.actor)
    }
  }

  //Training Roll
  static async _trainingRoll (event, target) {
    if (this.actor.system.improv) {
      AOVCharDevelop.trainingRoll(this.actor,'training')
    }
  }

  //Research Roll
  static async _researchRoll (event, target) {
    if (this.actor.system.improv) {
      AOVCharDevelop.trainingRoll(this.actor,'research')
    }
  }

  //Characteristic Improvement Roll
  static async _statImpRoll (event, target) {
    if (this.actor.system.improv) {
      AOVCharDevelop.statImpRoll(this.actor)
    }
  }

  //Worship Rolls
  static async _worship (event, target) {
    if (this.actor.system.worship) {
      AOVCharDevelop.worshipRoll(this.actor)
    }
  }

  //Farm Circumstance Rolls
  static async _farming (event, target) {
    if (this.actor.system.farming) {
      AOVCharDevelop.farmCircRoll(this.actor)
    }
  }

  //Vadmal Production
  static async _vadprod (event, target) {
    if (this.actor.system.vadprod) {
      AOVCharDevelop.vadprod(this.actor)
    }
  }

  //Aging
  static async _aging (event, target) {
    if (this.actor.system.aging) {
      AOVCharDevelop.aging(this.actor)
    }
  }

  //Family Rolls
  static async _familyroll (event, target) {
    if (this.actor.system.family) {
      AOVCharDevelop.family(this.actor)
    }
  }

  //Expand-Collapse NPC sections
  static async _npcSections (event, target) {
    let prop = target.dataset.property
    let status = true
    if (prop === 'collapse') {
      status = false
    }
    await this.actor.update ({
      'system.hitlocView': status,
      'system.skillView': status,
      'system.weaponView': status,
      'system.powerView': status,
      'system.equipView': status,
      'system.passionView': status,
      'system.devotionView': status,
    })
  }

  //Add a Wound from a hit location
  static async _addWound (event, target) {
    const hitLocId = target.closest('li').dataset.itemId;
    const docCls = getDocumentClass('Item');
    const docData = {
      name: docCls.defaultName({
        type: 'wound',
        parent: this.actor
      }),
      type: 'wound',
      system: {
        hitLocId: hitLocId
      }
    };
    // Loop through the dataset and add it to our docData
    for (const [dataKey, value] of Object.entries(target.dataset)) {
      // Ignore data attributes that are reserved for action handling
      if (['action', 'documentClass'].includes(dataKey)) continue;
      foundry.utils.setProperty(docData, dataKey, value);
    }
    // Create the embedded document
    const newItem = await docCls.create(docData, { parent: this.actor });

    if (game.settings.get('aov', "actorItemCID")) {
      let key = await game.aov.cid.guessId(newItem)
      await newItem.update({
        'flags.aov.cidFlag.id': key,
        'flags.aov.cidFlag.lang': game.i18n.lang,
        'flags.aov.cidFlag.priority': 0
      })
    }
      newItem.sheet.render(true);
  }

  //Open Wiki in web-browser
  static async _openWiki (event, target) {
    const url = "https://github.com/cragstone/aov/wiki";
    window.open(url, "_blank");
  }

  //Spend Wyrd
  static async _spendWyrd (event,target) {
     if (event.detail === 2) {  //Only perform on double click
      let data = {
        title: game.i18n.localize('AOV.spendWyrdHint'),
      }
      const html = await foundry.applications.handlebars.renderTemplate('systems/aov/templates/dialog/valueInput.hbs', data);

      let val = await AOVDialog.input({
        window: { title: 'AOV.spendWyrd' },
        content: html,
        data,
      })

      if (!val) {return}
      if (val.valueInp > this.actor.system.abilities.pow.total) {
        ui.notifications.warn(game.i18n.localize('AOV.wyrdInsufficient'))
        return
      }
      await (this.actor).update ({'system.abilities.pow.xp': this.actor.system.abilities.pow.xp - val.valueInp})
          ui.notifications.warn(game.i18n.format('AOV.wyrdSpent', { points: val.valueInp }))
    }
  }



  //-------------Drag and Drop--------------

  // Define whether a user is able to begin a dragstart workflow for a given drag selector
  _canDragStart(selector) {
    return this.isEditable;
  }

  //Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
  _canDragDrop(selector) {
    return this.isEditable;
  }

  //Callback actions which occur at the beginning of a drag start workflow.
  _onDragStart(event) {
    const docRow = event.currentTarget.closest('li');
    if ('link' in event.target.dataset) return;
    // Chained operation
    let dragData = this._getEmbeddedDocument(docRow)?.toDragData();
    if (!dragData) return;
    // Set data transfer
    event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
  }

  //Callback actions which occur when a dragged element is over a drop target.
  _onDragOver(event) { }

  //Callback actions which occur when a dragged element is dropped on a target.
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    const actor = this.actor;
    const allowed = Hooks.call('dropActorSheetData', actor, this, data);
    if (allowed === false) return;

    // Handle different data types
    switch (data.type) {
      case 'ActiveEffect':
        return this._onDropActiveEffect(event, data);
      case 'Actor':
        return this._onDropActor(event, data);
      case 'Item':
        return this._onDropItem(event, data);
      case 'Folder':
        return this._onDropFolder(event, data);
    }
  }

  //Handle the dropping of ActiveEffect data onto an Actor Sheet
  async _onDropActiveEffect(event, data) {
    const aeCls = getDocumentClass('ActiveEffect');
    const effect = await aeCls.fromDropData(data);
    if (!this.actor.isOwner || !effect) return false;
    if (this.actor.type === 'party') return false;
    return aeCls.create(effect, { parent: this.actor });
  }

  //Handle dropping of an Actor data onto another Actor sheet
  async _onDropActor(event, data) {
    if (!this.actor.isOwner) return false;
    await this.DropActor(data);
  }

  //Handle dropping of an item reference or item data onto an Actor Sheet
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;
    if (this.actor.type === 'party') {
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.cantAddItems', { actorType: game.i18n.localize('TYPES.Actor.'+ this.actor.type) }))
      return false;
    }
    const item = await Item.implementation.fromDropData(data);
    // Handle item sorting within the same Actor
    if (this.actor.uuid === item.parent?.uuid)
      return this._onSortItem(event, item);
    // Create the owned item
    return this._onDropItemCreate(item, event);
  }

  //Handle dropping of a Folder on an Actor Sheet.
  async _onDropFolder(event, data) {
    if (!this.actor.isOwner) return [];
    if (this.actor.type === 'party') return false;
    const folder = await Folder.implementation.fromDropData(data);
    if (folder.type !== 'Item') return [];
    const droppedItemData = await Promise.all(
      folder.contents.map(async (item) => {
        if (!(document instanceof Item)) item = await fromUuid(item.uuid);
        return item;
      })
    );
    return this._onDropItemCreate(droppedItemData, event);
  }

  //Handle the final creation of dropped Item data on the Actor.
  async _onDropItemCreate(itemData, event) {
    itemData = await AOVActorItemDrop._AOVonDropItemCreate(itemData, this.actor)
    const list = await this.actor.createEmbeddedDocuments('Item', itemData);
    return list;
  }

  //Returns an array of DragDrop instances
  get dragDrop() {
    return this._dragDrop;
  }

  _dragDrop;

  //Create drag-and-drop workflow handlers for this Application
  _createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      };
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      };
      return new foundry.applications.ux.DragDrop(d);
    });
  }

  //Drop Actor on to an Actor Sheet
  async DropActor(data) {
    let newActor = await fromUuid(data.uuid)
    if (!newActor) {return}
    if (this.actor.type === 'character' && newActor.type === 'farm') {
      const farms = this.actor.system.farms ? foundry.utils.duplicate(this.actor.system.farms) : []
      //Check farm is not in farms list
      if (farms.find(el => el.uuid === newActor.uuid)) {
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.dupItem', { itemName: (newActor.name +"(" + newActor.uuid +")") }));
        return
      }
      farms.push({uuid:newActor.uuid})
      await this.actor.update({'system.farms': farms})
    } else if (this.actor.type === 'party' && (['character'].includes(newActor.type))) {
      const members = this.actor.system.members ? foundry.utils.duplicate(this.actor.system.members) : []
      //Check member is not in members list
      if (members.find(el => el.uuid === newActor.uuid)) {
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.dupItem', { itemName: (newActor.name +"(" + newActor.uuid +")") }));
        return
      }
      members.push({uuid:newActor.uuid})
      await this.actor.update({'system.members': members})
    } else {
      ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.cantDropActor', { itemType: game.i18n.localize('TYPES.Actor.'+ newActor.type), actorType: game.i18n.localize('TYPES.Actor.'+ this.actor.type) }))
      return
    }
  }
}
