import { AOVactorDetails } from "./actor-details.mjs";
import AOVDialog from "../setup/aov-dialog.mjs";
import { AOVSelectLists } from "./select-lists.mjs";
import { RECard } from "../chat/resistance-chat.mjs";
import { OPCard } from "../chat/opposed-chat.mjs";
import { AUCard } from "../chat/augment-chat.mjs";
import { COCard } from "../chat/combat-chat.mjs";

export class RollType {
  static CHARACTERISTIC = "CH";
  static SKILL = "SK";
  static PASSION = "PA";
  static DAMAGE = "DM";
  static WEAPON = "WP";
  static STATUS = "ST";
  static REPUTATION = "RP";
}

export class CardType {
  static UNOPPOSED = "NO";
  static FIXED = "FI";  //Resistance roll against Fixed target (e.g. a poison)
  static RESISTANCE = "RE";
  static OPPOSED = "OP";
  static AUGMENT = "AU";
  static COMBAT = "CO";
}

export class RollResult {
  static FUMBLE = 0;
  static FAIL = 1;
  static SUCCESS = 2;
  static SPECIAL = 3
  static CRITICAL = 4;
}

export class AOVCheck {
  //Start to prepare the config
  static async _trigger(options = {}) {
    const config = await AOVCheck.normaliseRequest(options);
    if (config === false) {
      return;
    }
    const msgID = await AOVCheck.startCheck(config);
    return msgID;
  }

  //Check the request and build out the config
  static async normaliseRequest(options) {
    //Set Basic Config
    let particName = "";
    let particId = "";
    let particType = "";
    let actorType = "";
    let particImg = "icons/svg/mystery-man.svg";
    let partic = "";
    let particActor = "";
    partic = await AOVactorDetails._getParticipantId(
      options.token,
      options.actor,
    );
    particImg = await AOVactorDetails.getParticImg(
      partic.particId,
      partic.particType,
    );
    particActor = await AOVactorDetails._getParticipant(
      partic.particId,
      partic.particType,
    );
    particName = partic.particName;
    particId = partic.particId;
    particType = partic.particType;
    actorType = particActor.type;

    //Set basic roll configuration
    let config = {
      rollType: options.rollType,
      cardType: options.cardType,
      chatType: CONST.CHAT_MESSAGE_STYLES.OTHER,
      dialogTemplate: "systems/aov/templates/dialog/rollOptions.hbs",
      chatTemplate: "systems/aov/templates/chat/roll-result.hbs",
      state: options.state ?? "open",
      wait: false,
      particName,
      particId,
      particType,
      actorType,
      particImg,
      targetId: options.targetId ?? "",
      targetType: options.targetType ?? "",
      targetLoc: options.targetLoc ?? "",
      origID: options.origID,
      characteristic: options.characteristic ?? false,
      skillId: options.skillId ?? false,
      damType: "",
      damTypeLabel: "",
      dbLabel: "s",
      successLevel: options.successLevel ?? "99",
      successLabel: "",
      db : "",
      difficulty: "",
      diffLabel: "",
      targetScore: 0,
      rawScore: 0,
      oppRes: 0,
      targetAdj: 0,
      augAdj: 0,
      encPenalty: 0,
      mqPenalty: 0,
      checkDodge: false,
      flatMod: options.flatMod ?? 0,
      damBonus: options.damBonus ?? 0,
      rollFormula: options.rollFormula ?? "1D100",
      resultLevel: options.resultLevel ?? 0,
      shiftKey: options.shiftKey ?? false,
      userID: game.user._id,
    }

    //Adjust config based on ROLL TYPE
    //
    let tempItem = ""
    switch (options.rollType) {
      case RollType.CHARACTERISTIC:
        config.label =
          particActor.system.abilities[config.characteristic].label ?? "";
        config.rawScore =
          particActor.system.abilities[config.characteristic].total*5 ?? 0;
        break;
      case RollType.SKILL:
      case RollType.PASSION:
        tempItem = await particActor.items.get(config.skillId)
        config.label = tempItem.name
        if (tempItem.system.total) {
          config.rawScore = tempItem.system.total
        } else {
          config.rawScore = (tempItem.system.base ?? 0) + (tempItem.system.xp ?? 0) + (tempItem.system.home ?? 0) + (tempItem.system.pers ?? 0) + (tempItem.system.effects ?? 0)
          if (config.rawScore > 0) {
            config.rawScore = config.rawScore + particActor.system[tempItem.system.category] ?? 0
          }
        }
        //Check for specific Skill Options
        let skillFlag = tempItem.flags.aov?.cidFlag?.id

        //If Dodge skill check to see if there is an open Combat
        if (skillFlag === 'i.skill.dodge') {
          let checkData={cardType: 'CO'}
          let open = await AOVCheck.checkNewMsg(checkData)
          if (open) {
            config.checkDodge = true
          } else if (options.cardType === CardType.COMBAT) {
            config.checkDodge = false
            options.cardType = 'NO'
          }
        }
        //If Move Quietly skill apply MQ penalty
        if (skillFlag === 'i.skill.move-quietly') {
          config.mqPenalty = particActor.system.mqPenalty
        }
        //Check to see if ENC Penalty applies
        if (tempItem.type === 'skill') {
          if (['agi','man','ste','cbt'].includes(tempItem.system.category)) {
            config.encPenalty = (particActor.system.encPenalty ?? 0)
          }
        }

        //If this is an augment, and there is an open card and skill/passion has already been used then don't allow the addition
        if (options.cardType === CardType.AUGMENT) {
          let openCard = await AOVCheck.checkNewMsg(options);
          if (openCard && tempItem.system.augment) {
            ui.notifications.warn(game.i18n.format("AOV.ErrorMsg.augUsed", {type: tempItem.name}));
            return false;
          } else if (openCard) {
            await tempItem.update({'system.augment': true});
          }
        }
        break;
      case RollType.DAMAGE:
        tempItem = await particActor.items.get(config.skillId)
        config.label = tempItem.name
        config.rollFormula = tempItem.system.damage
        config.damType = tempItem.system.damType
        config.damTypeLabel = tempItem.system.damTypeLabel
        config.dbLabel = tempItem.system.dbLabel
        config.db = particActor.system.dmgBonus
        //Adjust Damage Bonus for Weapon Type
        if (tempItem.system.damMod === "h") {
          config.db = particActor.system.dmgBonus + "/2"
        } else if (tempItem.system.damMod === "n") {
          config.db = "0"
        }
        break;
      case RollType.WEAPON:
        tempItem = await particActor.items.get(config.skillId)
        config.label = tempItem.name
        config.rawScore = tempItem.system.total
        config.encPenalty = particActor.system.encPenalty
        break;
      case RollType.STATUS:
        config.label = game.i18n.localize('AOV.status')
        config.rawScore = particActor.system.status.total ?? 0;
        break;
      case RollType.REPUTATION:
        config.label = game.i18n.localize('AOV.reput')
        config.rawScore = particActor.system.reputation.total ?? 0;
        break;
      default:
        ui.notifications.error(
          game.i18n.format("AOV.ErrorMsg.rollInvalid", {type: options.rollType})
        );
        return false;
    }
    config.difficulty = "simple";
    config.diffLabel = game.i18n.localize("AOV.rolls.simple")
    config.targetScore = config.rawScore

    //Adjust config based on CARD TYPE
    let cardCheck = await AOVCheck.checkCardType(options.cardType,config)
    if (!cardCheck) {return false}
    return config
  }


  //Start the check now that the config has been prepared
  static async startCheck(config) {
    let particActor = await AOVactorDetails._getParticipant(
      config.particId,
      config.particType,
    );



    //If Shift key has been held then accept the defaults above otherwise call a Dialog box for Difficulty, Modifier etc
    if (!config.shiftKey) {
      let usage = await AOVCheck.RollDialog(config);
      if (usage === null) {return false}
      if (usage) {
        config.flatMod = Number(usage.checkBonus);
        config.difficulty = usage.diffOption ?? "";
        config.successLevel = usage.dmgLevel ?? "2";
        if (usage.ctOption) {
          config.damType = usage.ctOption
          config.damTypeLabel = game.i18n.localize('AOV.DamType.'+config.damType)
        }
        config.oppRes = usage.oppRes
        config.damBonus = usage.damBonus ?? 0;
        if (usage.dodgeCombat) {
          if (usage.dodgeCombat === 'yes') {
            config.cardType = CardType.COMBAT
            await AOVCheck.checkCardType(config.cardType,config)
          }
        }
      }
    }

    //Where difficulty used
    if (config.difficulty !="") {
      switch (config.difficulty) {
        //No adjustment if 'simple'
        case "easy":
          config.targetScore = Math.ceil(config.rawScore *4/5);
          break;
        case "moderate":
          config.targetScore = Math.ceil(config.rawScore * 3/5);
          break;
        case "hard":
          config.targetScore = Math.ceil(config.rawScore * 2/5);
          break;
        case "veryhard":
          config.targetScore = Math.ceil(config.rawScore /5);
          break;
        case "impossible":
          config.targetScore = Math.ceil(config.rawScore /10);
          break;
      }
    }

    //Adjust target Score for check Bonus, ENC Penalty and Move Quietly Penalty
    config.targetScore = config.targetScore + config.flatMod + config.encPenalty + config.mqPenalty


    //Adjust Target for Fixed Resistance Roll
    if (config.cardType === CardType.FIXED) {
      config.targetScore = config.targetScore - (5*config.oppRes) + 50
      config.targetScore = Math.max(Math.min(config.targetScore, 95),5)
      config.rawScore = config.rawScore/5;
    }

    //Adjust for Resistance Roll
    if (config.cardType === CardType.RESISTANCE) {
      config.rawScore = config.rawScore/5;
    }

    //If damage type is still Cut and Thrust default to Impale
    if (config.damType === 'ct') {
      config.damType = "i"
      config.damTypeLabel = game.i18n.localize('AOV.DamType.i')
    }

    //Adjust formula for damage roll factors
    if (config.successLevel === "99") {
      config.successLevel = 2
    }

    //For Critical and Special Successes
    if (["3","4"].includes(config.successLevel)) {
        switch (config.damType) {
          case "i":
            config.rollFormula = config.rollFormula + "+" + config.rollFormula
            break;
          case "s":
            config.rollFormula = config.rollFormula + "+" + config.rollFormula
            break;
          case "c":
          case "h":
            if (!['+0','0'].includes(config.db)) {
              let damRoll = new Roll (config.db)
              await damRoll.evaluateSync({maximize: true})
              config.db = config.db + "+" + damRoll.total
            }
            break;
        }
    }

    if (["4"].includes(config.successLevel)) {
      let maxDamRoll = new Roll(config.rollFormula)
      await maxDamRoll.evaluateSync({maximize: true})
      config.rollFormula = maxDamRoll.total
    }

    //If there is a damage bonus add it
    if (!['+0','0'].includes(config.db)) {
      config.rollFormula = config.rollFormula + config.db;
    }
    config.successLevelLabel = game.i18n.localize('AOV.resultLevel.'+ config.successLevel)

    //Make the Dice Roll - unless we are told to wait
    if (!config.wait) {
      await AOVCheck.makeRoll(config);
    }

    //Format the data so it's in the same format as will be held in the Chat Message when saved
    let chatMsgData = {
      rollType: config.rollType,
      cardType: config.cardType,
      chatType: config.chatType,
      chatTemplate: config.chatTemplate,
      state: config.state,
      wait: config.wait,
      rolls: config.roll,
      resultLevel: config.resultLevel,
      rollResult: config.rollResult,
      chatCard: [
        {
          rollType: config.rollType,
          particId: config.particId,
          particType: config.particType,
          particName: config.particName,
          particImg: config.particImg,
          actorType: config.actorType,
          targetId: config.targetId,
          targetType: config.targetType,
          targetLoc: config.targetLoc,
          characteristic: config.characteristic ?? false,
          label: config.label,
          targetScore: config.targetScore,
          rawScore: config.rawScore,
          difficulty: config.difficulty,
          diffLabel: game.i18n.localize("AOV.rolls." + config.difficulty),
          rollFormula: config.rollFormula,
          flatMod: config.flatMod,
          encPenalty: config.encPenalty,
          mqPenalty: config.mqPenalty,
          targetAdj: config.targetAdj,
          rollResult: config.rollResult,
          rollVal: config.rollVal,
          roll: config.roll,
          oppRes: config.oppRes,
          damTypeLabel: config.damTypeLabel,
          damBonus: config.damBonus,
          successLevel: config.successLevel,
          successLevelLabel: config.successLevelLabel,
          augAdj: config.augAdj,
          diceRolled: config.diceRolled,
          skillId: config.skillId,
          resultLevel: config.resultLevel,
          resultLabel: game.i18n.localize(
            "AOV.resultLevel." + config.resultLevel,
          ),
          userID: config.userID,
          origID: config.origID
        },
      ],
    };

    //In some circumstances add details to an existing chat message rather than create a new one
    if (['RE','OP','AU','CO'].includes(config.cardType)) {
      //Check to see if there is an open card within paramaters
      let checkMsgId = await AOVCheck.checkNewMsg(chatMsgData)
      if (checkMsgId != false) {
        // Trigger adding check to the card and then stop
        await RECard.REAdd(chatMsgData, checkMsgId)
        return
      }
    }



    //Create the ChatMessage and Roll Dice
    const html = await AOVCheck.startChat(chatMsgData);
    let msgID = await AOVCheck.showChat(html, chatMsgData);

    return msgID;
  }


  //Call Dice Roll, calculate Result and store original results in rollVal
  static async makeRoll(config) {
    let roll = new Roll(config.rollFormula);
    await roll.evaluate();
    config.roll = roll;
    config.rollResult = Math.ceil(Number(roll.total));
    config.rollVal = config.rollResult;

    let diceRolled = ""
    for (let diceRoll = 0; diceRoll < roll.dice.length; diceRoll++) {
      for (let thisDice = 0; thisDice < roll.dice[diceRoll].values.length; thisDice++) {
        if (thisDice != 0 || diceRoll != 0) {
          diceRolled = diceRolled + ", "
        }
        diceRolled = diceRolled + roll.dice[diceRoll].values[thisDice]
      }
    }
    config.diceRolled = diceRolled

    //Don't need success levels in some cases
    if ([RollType.DAMAGE].includes(config.rollType)) {
      config.rollVal = config.rollVal + config.damBonus
      return;
    }
    //Get the level of Success
    config.resultLevel = await AOVCheck.successLevel(config);
    return;
  }



  // Calculate Success Level
  static async successLevel(config) {

    let critical = Math.max(Math.round(config.targetScore/20),1)
    let special = Math.max(Math.round(config.targetScore/5),1)
    let fumble = Math.min(96+Math.round(config.targetScore/20),100)
    //Min success of 5% and capped at 95%
    let success = Math.min(Math.max(config.targetScore,5),95)

    let resultLevel = -1;
    //Calculate result level
    if (config.rollResult <= critical) {
      resultLevel = RollResult.CRITICAL;
    } else if (config.rollResult <= special) {
      resultLevel = RollResult.SPECIAL;
    } else if (config.rollResult <= success) {
      resultLevel = RollResult.SUCCESS;
    } else if (config.rollResult >= fumble) {
      resultLevel = RollResult.FUMBLE;
    } else {
      resultLevel = RollResult.FAIL;
    }

    return resultLevel;
  }


  // Prep the chat card
  static async startChat(chatMsgData) {
    let html = await foundry.applications.handlebars.renderTemplate(chatMsgData.chatTemplate, chatMsgData);
    return html;

  }

  // Display the chat card and roll the dice
  static async showChat(html, chatMsgData) {
    let alias = game.i18n.localize("AOV.card." + chatMsgData.cardType);
    if (chatMsgData.rollType === 'DM') {
      alias = game.i18n.localize("AOV.rolls." + chatMsgData.rollType)
    }

    let chatData = {};
    chatData = {
      user: game.user.id,
      type: chatMsgData.chatType,
      content: html,
      flags: {
        aov: {
          initiator: chatMsgData.chatCard[0].particId,
          initiatorType: chatMsgData.chatCard[0].particType,
          chatTemplate: chatMsgData.chatTemplate,
          state: chatMsgData.state,
          cardType: chatMsgData.cardType,
          rollType: chatMsgData.rollType,
          successLevel: chatMsgData.successLevel,
          chatCard: chatMsgData.chatCard,
          successLevelLabel: chatMsgData.successLevelLabel,
        },
      },

      speaker: {
        actor: chatMsgData.chatCard[0].particId,
        alias: alias,
      },
    };
    //List the Card Types that will make Dice So Nice show dice rolls
    if (["NO","FI"].includes(chatMsgData.cardType)) {
      chatData.rolls = [chatMsgData.rolls];
    }
    let msg = await ChatMessage.create(chatData);
    ui.chat.render();  //Sometimes chat messages weren't showing - hopefully this solves it
    return msg._id;
  }

  static async checkCardType(cardType, config) {
    switch (cardType) {
      case CardType.UNOPPOSED:
        config.state = "closed";
        //If this is a damage card and there is a target then make status open
        if (config.rollType === 'DM' && config.targetId !="") {
          config.state = "open";
        }
        config.chatTemplate =
          "systems/aov/templates/chat/roll-result.hbs";
        break;
      case CardType.FIXED:
        config.state = "closed";
        config.chatTemplate =
          "systems/aov/templates/chat/roll-result.hbs";
        config.shiftKey = false;  //always need to open dialog to get target
        break;
      case CardType.RESISTANCE:
        config.wait = true;
        config.chatTemplate =
          "systems/aov/templates/chat/roll-resistance.hbs";
        break;
      case CardType.OPPOSED:
        config.wait = true;
        config.chatTemplate =
          "systems/aov/templates/chat/roll-opposed.hbs";
        break;
      case CardType.AUGMENT:
        config.wait = true;
        config.chatTemplate =
          "systems/aov/templates/chat/roll-augment.hbs";
        break;
      case CardType.COMBAT:
        config.wait = true;
        config.chatTemplate =
          "systems/aov/templates/chat/roll-combat.hbs";
        break;
      default:
        ui.notifications.error(
          game.i18n.format("AOV.ErrorMsg.cardInvalid", {type: cardType})
        );
        return false;
      }
      return true
    }



  //Function to call the Modifier Dialog box
  static async RollDialog(options) {
    let diffOptions = await AOVSelectLists.difficultyOptions();
    let dmgLevels = await AOVSelectLists.dmgLevels();
    let ctOptions = await AOVSelectLists.cutThrust();
    let cardLabel = game.i18n.localize('AOV.card.'+options.cardType)
    let askFixed = false
    let askDiff = false
    let askSuccess = false
    let askDamType = false
    let askDamBonus = false
    let askBonus = true
    let askDodge = options.checkDodge
    if (options.rollType === 'DM') {
      cardLabel = game.i18n.localize('AOV.rolls.DM')
      askBonus = false
      askDamBonus = true
      if (options.successLevel === "99") {
        askSuccess = true
      }
      if (options.damType === 'ct') {
        askDamType = true
      }
    }
    if (['FI'].includes(options.cardType)) {
      askFixed = true
    }
    if (options.cardType === 'NO' && options.rollType === 'CH') {
      askDiff = true
    }

    const data = {
      cardType: options.cardType,
      cardLabel,
      label: options.label,
      rollType: options.rollType,
      flatMod: options.flatMod,
      damBonus: options.damBonus,
      damType: options.damType,
      dmgLevels,
      askFixed,
      askDiff,
      askSuccess,
      askDamType,
      askDamBonus,
      askBonus,
      askDodge,
      diffOptions,
      ctOptions,
      successLevel: options.successLevel
    };
    const html = await foundry.applications.handlebars.renderTemplate(options.dialogTemplate, data);
    const dlg = await AOVDialog.input(
      {
        window: {title: game.i18n.localize('AOV.card.rollMods')},
        content: html,
        ok: {
          label: game.i18n.localize("AOV.rollDice"),
        },
      }
    );
    return dlg
  }

  //Check to see if there is an open card that matches the cardType that's not more than a day old
  static async checkNewMsg(config) {
    let messages = ui.chat.collection.filter(message => {
      if (
        config.cardType === message.getFlag('aov', 'cardType') &&
        message.getFlag('aov', 'state') !== 'closed'
      ) {
        return true
      }
      return false
    })

    if (messages.length) {
      // Old messages can't be used if message is more than a day old mark it as resolved
      const timestamp = new Date(messages[messages.length-1].timestamp)
      const now = new Date()
      const timeDiffSec = (now - timestamp) / 1000
      if (60 * 60 * 24 < timeDiffSec) {
        await messages[messages.length-1].setFlag('aov', 'state', 'closed')
        messages = []
      }
    }

    if (!messages.length) { return false }
    else { return messages[messages.length-1].id }
  }


  //Function when Chat Message buttons activated to call socket
  static async triggerChatButton(event) {
    const targetElement = event.currentTarget
    const presetType = targetElement.dataset?.preset
    const dataset = targetElement.dataset
    const targetChat = $(targetElement).closest('.message')
    let targetChatId = targetChat[0].dataset.messageId
    let origin = game.user.id
    let originGM = game.user.isGM

    //Make sure the player triggers these
    if(presetType === 'damage-card') {
      await COCard.CODamage({ presetType, targetChatId, origin, originGM, event, dataset })
    } else if(presetType === 'fumble-card') {
      await COCard.COFumble({ presetType, targetChatId, origin, originGM, event, dataset })
    } else {
    //Otherwise check if a GM needs to
      if (game.user.isGM) {
        AOVCheck.handleChatButton({ presetType, targetChatId, origin, originGM, event, dataset })
      } else {
        const availableGM = game.users.find(d => d.active && d.isGM)?.id
        if (availableGM) {
          game.socket.emit('system.aov', {
            type: 'chatUpdate',
            to: availableGM,
            value: { presetType, targetChatId, origin, originGM, event, dataset }
          })
        } else {
          ui.notifications.warn(game.i18n.localize('AOV.noAvailableGM'))
        }
      }
    }
  }


  //Handle changes to Cards based on the presetType value - will be carried out by a GM
  static async handleChatButton(data) {
    const presetType = data.presetType
    let targetMsg = await game.messages.get(data.targetChatId)
    switch (presetType) {
      case "close-card":
        await RECard.REClose(data)
        break
      case "remove-roll":
        await RECard.RERemove(data)
        break
      case "resolve-re-card":
        await RECard.REResolve(data)
        break
      case "resolve-op-card":
        await OPCard.OPResolve(data)
        break
      case "resolve-au-card":
        await AUCard.AUResolve(data)
        break
      case "resolve-co-card":
        await COCard.COResolve(data)
        break
      case "roll-hitloc-card":
        await COCard.COHitLoc(data)
        break
      case "apply-damage-card":
         await COCard.COApplyDmg(data)
        break
      default:
        return
    }
    const pushhtml = await AOVCheck.startChat(targetMsg.flags.aov)
    await targetMsg.update({ content: pushhtml })
    return
  }

}

