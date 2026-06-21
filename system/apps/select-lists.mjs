export class AOVSelectLists {


  //Equipped List
  static async equippedOptions(type) {
    let options = {
      1: game.i18n.localize("AOV.carried"),
      2: game.i18n.localize("AOV.packed"),
      3: game.i18n.localize("AOV.stored"),
    };
    return options;
  }

  //Skill Categories
  static async skillCat() {
    let options = {
      "agi": game.i18n.localize("AOV.skillCat.agi"),
      "cbt": game.i18n.localize("AOV.skillCat.cbt"),
      "com": game.i18n.localize("AOV.skillCat.com"),
      "knw": game.i18n.localize("AOV.skillCat.knw"),
      "man": game.i18n.localize("AOV.skillCat.man"),
      "myt": game.i18n.localize("AOV.skillCat.myt"),
      "per": game.i18n.localize("AOV.skillCat.per"),
      "ste": game.i18n.localize("AOV.skillCat.ste"),
      "zzz": game.i18n.localize("AOV.skillCat.zzz"),
    };
    return options;
  }

  //Skill Base Value Options
  static async baseSkill() {
    let options = {
      "fixed": game.i18n.localize("AOV.fixed"),
      "dex2": game.i18n.localize("AOV.Ability.dex") + "*2",
      "dex3": game.i18n.localize("AOV.Ability.dex") + "*3",
    };
    return options;
  }

  //Personality Types
  static async persType() {
    let options = {
      "mighty": game.i18n.localize("AOV.Personality.mightyLong"),
      "steadfast": game.i18n.localize("AOV.Personality.steadfastLong"),
      "spiritual": game.i18n.localize("AOV.Personality.spiritualLong"),
      "wanderer": game.i18n.localize("AOV.Personality.wandererLong"),
      "cunning": game.i18n.localize("AOV.Personality.cunningLong"),
      "manipulative": game.i18n.localize("AOV.Personality.manipulativeLong"),

    };
    return options;
  }

  //Weapon Types
  static async weaponType() {
    let options = {
      "melee": game.i18n.localize("AOV.melee"),
      "missile": game.i18n.localize("AOV.missile"),
      "naturalWpn": game.i18n.localize("AOV.naturalWpn"),
      "thrown": game.i18n.localize("AOV.thrown"),
    };
    return options;
  }

  //Hit Loc Types
  static async hitLocType() {
    let options = {
      "limb": game.i18n.localize("AOV.HitLoc.limb"),
      "abdomen": game.i18n.localize("AOV.HitLoc.abdomen"),
      "chest": game.i18n.localize("AOV.HitLoc.chest"),
      "head": game.i18n.localize("AOV.HitLoc.head"),
      "general": game.i18n.localize("AOV.HitLoc.general"),
    };
    return options;
  }

  //Hit Loc Options for the Actor
  static getHitLocOptions(actor) {
    let options = {}
    let newOption = {}
    for (let itm of actor.items) {
      if (itm.type === 'hitloc') {
          newOption = { [itm.id]: itm.name, };
          options = Object.assign(options, newOption)
      }
    }
    return options
  }

  static async preLoadCategoriesCategories() {
    //Preload best Weapon Categories, Passions, Skills and Weapons - used in Character Creation
    return new Promise(async (resolve, reject) => {
      resolve(await game.aov.cid.fromCIDRegexBest({ cidRegExp: new RegExp('^i\.(weaponcat|passion|skill|weapon|devotion)\.'), type: 'i', showLoading: false }))
    })
  }

  //Weapon Skills List
  static async getWeaponSkills() {
    const weaponSkillsList = (await game.aov.categories).filter(d => d.type === 'skill').filter(e => e.system.category === 'cbt')
    weaponSkillsList.sort(function (a, b) {
      return a.name.localeCompare(b.name)
    });
    let options = weaponSkillsList.reduce((c, i) => {
      c[i.flags.aov.cidFlag.id] = i.name
      return c
    }, {})
    return options
  }

  //Weapon Category List
  static async getWeaponCategories() {
    const weaponCatList = (await game.aov.categories).filter(d => d.type === 'weaponcat')
    weaponCatList.sort(function (a, b) {
      return a.name.localeCompare(b.name)
    });
    let options = weaponCatList.reduce((c, i) => {
      c[i.flags.aov.cidFlag.id] = i.name
      return c
    }, {})
    return options
  }

  //Devotion Points
  static async dpOptions() {
    let options = {
      0: "0",
      1: "1",
      2: "2",
      3: "3",
    };
    return options;
  }

  //Farm Type Options
  static async farmTypeOptions() {
    let options = {
      "dairy": game.i18n.localize("AOV.Farm.dairy"),
      "sheep": game.i18n.localize("AOV.Farm.sheep"),
      "fishing": game.i18n.localize("AOV.Farm.fishing"),
      "driftwood": game.i18n.localize("AOV.Farm.driftwood"),
    };
    return options;
  }

  //Farm Circumstances Options
  static async farmCircOptions() {
    let options = {
      "famine": game.i18n.localize("AOV.FarmCirc.famine"),
      "bad": game.i18n.localize("AOV.FarmCirc.bad"),
      "good": game.i18n.localize("AOV.FarmCirc.good"),
      "excellent": game.i18n.localize("AOV.FarmCirc.excellent"),
      "superlative": game.i18n.localize("AOV.FarmCirc.superlative"),
    };
    return options;
  }

  //Damage Type Options
  static async dmgTypeOptions() {
    let options = {
      "c": game.i18n.localize("AOV.DamType.c"),
      "ct": game.i18n.localize("AOV.DamType.ct"),
      "h": game.i18n.localize("AOV.DamType.h"),
      "i": game.i18n.localize("AOV.DamType.i"),
      "s": game.i18n.localize("AOV.DamType.s"),
    };
    return options;
  }

  //Damage Levels
  static async dmgLevels() {
    let options = {
      "2": game.i18n.localize("AOV.resultLevel.2"),
      "3": game.i18n.localize("AOV.resultLevel.3"),
      "4": game.i18n.localize("AOV.resultLevel.4"),
    };
    return options;
  }

  //Cut&Thrust damage
  static async cutThrust() {
    let options = {
      "i": game.i18n.localize("AOV.DamType.i"),
      "s": game.i18n.localize("AOV.DamType.s"),
    };
    return options;
  }

  //Effect Options - For Use on Runes
  static async effectOptions() {
    let options = {
      "none": game.i18n.localize("AOV.noneSelected")
    }
    let effectKeys = await foundry.utils.duplicate(CONFIG.AOV.keysActiveEffects)
    let newOption = {}
    for (let [key,name] of Object.entries(effectKeys)) {
      newOption = { [key]: game.i18n.localize(name), };
      options = Object.assign(options, newOption)
    }

    const effectSkillOptions = (await game.aov.categories).filter(d => d.type === 'skill')
    effectSkillOptions.sort(function (a, b) {
      return a.name.localeCompare(b.name)
    });
    let skillList = effectSkillOptions.reduce((c, i) => {
      let effectPath = "system.cidFlagItems." + i.flags.aov.cidFlag.id + ".system.effects"
      c[effectPath] = (game.i18n.localize('AOV.skill') + ": " + i.name)
      return c
    }, {})

    options = Object.assign(options, skillList)

    let specialEffectKeys = await foundry.utils.duplicate(CONFIG.AOV.keysSpecialActiveEffects)
    for (let [key,name] of Object.entries(specialEffectKeys)) {
      newOption = { [key]: game.i18n.localize('AOV.special') + ": " + game.i18n.localize(name), };
      options = Object.assign(options, newOption)
    }


    return options;
  }

  //Owned Rune List
  static async ownedRuneList(actor) {
    let options = {"none":game.i18n.localize("AOV.noneSelected")}
    const runeList = (await actor.items).filter(d => d.type === 'rune')
    runeList.sort(function (a, b) {
      return a.name.localeCompare(b.name)
    });
    let newRunes = runeList.reduce((c, i) => {
      c[i.flags.aov?.cidFlag?.id] = i.name
      return c
    }, {})
    options = Object.assign(options, newRunes)
    return options;
  }

  //Seigur Realm List
  static async realmList() {
    let options = {
      "mind": game.i18n.localize("AOV.realm.mind"),
      "body": game.i18n.localize("AOV.realm.body"),
      "spirit": game.i18n.localize("AOV.realm.spirit"),
      "weave": game.i18n.localize("AOV.realm.weave")
    };
    return options;
  }

  //Seigur Duration List
  static async durationList() {
    let options = {
      0: game.i18n.localize("AOV.duration.0"),
      1: game.i18n.localize("AOV.duration.1"),
      2: game.i18n.localize("AOV.duration.2"),
      3: game.i18n.localize("AOV.duration.3"),
      4: game.i18n.localize("AOV.duration.4"),
      5: game.i18n.localize("AOV.duration.5"),
      6: game.i18n.localize("AOV.duration.6"),
    };
    return options;
  }

  //Seigur Distance List
  static async distanceList() {
    let options = {
      0: game.i18n.localize("AOV.distance.0"),
      1: game.i18n.localize("AOV.distance.1"),
      2: game.i18n.localize("AOV.distance.2"),
      3: game.i18n.localize("AOV.distance.3"),
      4: game.i18n.localize("AOV.distance.4"),
      5: game.i18n.localize("AOV.distance.5"),
      6: game.i18n.localize("AOV.distance.6"),
    };
    return options;
  }

  //Seigur Dimension List
  static async dimensionList() {
    let options = {
      0: game.i18n.localize("AOV.dimension.0"),
      1: game.i18n.localize("AOV.dimension.1"),
      2: game.i18n.localize("AOV.dimension.2"),
      3: game.i18n.localize("AOV.dimension.3"),
      4: game.i18n.localize("AOV.dimension.4"),
      5: game.i18n.localize("AOV.dimension.5"),
      6: game.i18n.localize("AOV.dimension.6"),
    };
    return options;
  }

  //Ship Hull Types
  static async hullTypes() {
    let options = {
      "barge": game.i18n.localize("AOV.ship.barge"),
      "merchant": game.i18n.localize("AOV.ship.merchant"),
      "warship": game.i18n.localize("AOV.ship.warship"),
    };
    return options;
  }

  //Wind Type
  static async windTypes() {
    let options={
      "calm": game.i18n.localize("AOV.wind.calm"),
      "lightair": game.i18n.localize("AOV.wind.lightair"),
      "breeze": game.i18n.localize("AOV.wind.breeze"),
      "lightwind": game.i18n.localize("AOV.wind.lightwind"),
      "moderatewind": game.i18n.localize("AOV.wind.moderatewind"),
      "strongwind": game.i18n.localize("AOV.wind.strongwind"),
      "freshgale": game.i18n.localize("AOV.wind.freshgale"),
      "wholegale": game.i18n.localize("AOV.wind.wholegale"),
      "hurricane": game.i18n.localize("AOV.wind.hurricane"),
    };

    return options
  }

  //Ability Difficulty Options
  static async difficultyOptions() {
    let options = {
      "simple": game.i18n.localize("AOV.rolls.simple")+" x5",
      "easy": game.i18n.localize("AOV.rolls.easy")+" x4",
      "moderate": game.i18n.localize("AOV.rolls.moderate")+" x3",
      "hard": game.i18n.localize("AOV.rolls.hard")+" x2",
      "veryhard": game.i18n.localize("AOV.rolls.veryhard")+" x1",
      "impossible": game.i18n.localize("AOV.rolls.impossible")+" x½",
    };
    return options;
  }

  //Damage Modifer Types
  static async damModOptions() {
    let options = {
      "d": game.i18n.localize("AOV.DamMod.d"),
      "h": game.i18n.localize("AOV.DamMod.h"),
      "n": game.i18n.localize("AOV.DamMod.n"),
    };
    return options;
  }

  //Select Gender
  static async genderOptions() {
    let options = {
      "male": game.i18n.localize("AOV.male"),
      "female": game.i18n.localize("AOV.female"),
    };
    return options;
  }

  //Relationship Options
  static async relationOptions() {
    let options = {
      "spouse": game.i18n.localize("AOV.Relation.spouse"),
      "parent": game.i18n.localize("AOV.Relation.parent"),
      "grandparent": game.i18n.localize("AOV.Relation.grandparent"),
      "child": game.i18n.localize("AOV.Relation.child"),
      "grandchild": game.i18n.localize("AOV.Relation.grandchild"),
      "sibling": game.i18n.localize("AOV.Relation.sibling"),
      "cousin": game.i18n.localize("AOV.Relation.cousin"),
      "pibling": game.i18n.localize("AOV.Relation.pibling"),
      "nibling": game.i18n.localize("AOV.Relation.nibling"),
      "other": game.i18n.localize("AOV.Relation.other"),
    };
    return options;
  }

  //Social Rank List
  static async getSocialRank() {
    let options = {
      "outlaw": game.i18n.localize("AOV.outlaw"),
      "freedman": game.i18n.localize("AOV.freedman"),
      "tenant": game.i18n.localize("AOV.tenant"),
      "householder": game.i18n.localize("AOV.householder"),
      "godi": game.i18n.localize("AOV.godi"),
      "lawspeaker": game.i18n.localize("AOV.lawspeaker"),
    };
    return options;
  }

}



