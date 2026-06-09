## 13.28
-  Added an option in CCI: Open Documents so that if an Image Page is selected you can show this to all Players without changing permissions.

## 13.27
- Some more journal CSS edits
- Clicking on a scene that's linked in a journal will open the scene for the GM (rather than the config page).  The GM will still need to activate the scene.

## 13.26
- Augmentation rolls can now include up to 5 supporting rolls.
- Links to new repositorities updated in Update message & Game Instructions
- There is now a "question mark" icon on character sheets that will open the Wiki webpage
- Pause icon changed to a Viking shield

## 13.25
- Added some journal styling
- Weapons now have a "Special Damage" checkbox - if ticked an "asterisk" will appear after weapon damage on the Character/NPC sheet.
- Characters can have a global Armour Point modifier added on the GMTab - increasing AP to all hit locations
- Hit Locations, when on a Character, now show an AP Modifier field - use this to adjust the AP for the specific hit location

## 13.24
- Migration of Github repository

## 13.23
- Steadfast Personality now adds +30% to Manipulation and Combat (following updated errata)  -reverses a change in 13.16
- Stealth Category modifier adjusted in line with errata
- Personal Skill Bonuses - you can now only select a skill once during Character Creation following updated errata
- Some cosmetic changes to Character Creation on history and devotions (there's abit more info provided)
- Chat Skill notoifications in Dark Mode should now be visible

## 13.22
- You can now make Reputation and Status rolls from the character sheet (to the right of the stats block)
- There are two new Game Settings for NPCs - for characteristic and skill variants.
- Characteristic variants are multiplied for each 3D6 or part thereof, and can exceed racial maximums

## 13.21
- Character sheet tabs no longer shown when Character Sheet is minimised
- When making rolls and you click "x" to close the dialog box the roll will be cancelled
- Chat Card button text is now visible in dark mode
- New paper dolls for Hit Locations on character sheet courtesy of Chaosium.  Art by Lionel Marty
- New game settings (Display Options) - combat narrative can be restricted to GM only.  This doesn't impact any follow on buttons (e.g. damage roll)

## 13.20
- Dark/Light mode support has been added.  Journals remain in light mode.
- When the character/npc sheet is locked Skills and Passions that have been used to augment a roll will have a hand icon to the right of the score
- You can toggle this on or off by clicking on the hand/space
- You cannot add a 'used' skill or passion to an augment roll
- There is a GM tool to reset all augments flags for skills and passions.

## 13.19
- Add Can See Tile permission to CCI: Open Document (James B)
- Reduce minimum allowed Document permission to limited in CCI: Open Document (JamesB)
- Added a new "Party" actor - you can add party members to this and then show the sheet on the canvas.
- New Display Option Game Setting determines in players can see HP/MP Values (rather than just a bar).  GM can always see values
- Combat Initiative set to be DEX + (INT/100) so combat can be tracked
- Combat has two phases, (Statement of) Intent and Action.  You can adjust initiative in the Intent phase (e.g. Draw Sword, Move)
- New Display Option Game Settings so you can use Actor rather than Token Images for Combatants in the tracker
- Can now edit Active Effects for Custom Keys on embedded item sheets

## 13.18
- Additional CCI option, Ambient Light toggle added
- All CCI show/hide options have become show/hide/toggle

## 13.17
- Correction to the Stealth Skill Category Bonus
- Additional Chaosium Canvas Interface options added

## 13.16
- There is now a GM Tool for "Character Creation Phase" - which will allow some automation of character creation - you don't have to use it, you can still enter details manually.
- A short demo is available at https://www.youtube.com/watch?v=4WiwFc4DVgE
- There are three new item types - Species, Homeland and History Items
- A species is used to set the Dice for rolling Stats along with the Min and Max, plus hit locations.  You can either add a Species item to a character, or enter the info manually
- Homeland is used to determine starting skills, passions, equipment and Family History options.
- History items are used in conjunction with Rollable Tables (which are added to Homelands) to help with automated character creation.
- Please see the wiki for more detailed instructions on how to create the various items and how to use the Creation Phase.
- There is a new setting under display options for small screens - it uses a smaller version of the character sheet.
- Added a new CCI Drawing Toggle plus minor tweak to CCI Tile Toggle Layout and hints along (thanks James)
- There is a social status attribute now on the Stats tab that can be edited.
- Age of Vikings settings windows now use Light Mode only to make them more visible.
- Steadfast personality no longer adds the +20% bonus to weapons
- Spirit Animal skill and category have been removed following rules clarifications
- You can add a wound directly to a Character's hit location by clicking on the "AP/HP" section of the hit location (except in Development mode).
- Dropping specialised skills on the character now asks for a specialisation if it's not already on the skill

## 13.15
- Some tweaks to the character sheet so it is easier to resize and view.
- Character sheet tabs are more closely spaced together and swhould be easier to select
- On creating a new world you get a default scene with Age of Vikings cover art
- Fixed an issue with rolling Hit Locations not working if you don't have Dice So Nice activated (now works without DsN)
- Fixed an issue that the proper character sheet background wasnt showing on Linux systems
- A few housekeeping things in preparation for a later update

## 13.14
- The Chaosium Canvas Interface was designed for the Call of Cthulhu system, but thanks to James B (who created the CCI) it has been ported it over to Age of Vikings.
- James has kindly simplified the user interface so it needs less technical know-how to set up the options, but it does mean it may be slightly more limiting than the Call of Cthulhu version.
- Instructions are over on the wiki - https://github.com/Genii-Locorum/aov/wiki/Chaosium-Canvas-Interface-%E2%80%90CCI
- Added an instructions journal in the system which points users to the wiki

## 13.13
- NPCs now have a "notes" section that appears to the right of the NPC sheet and can be shown/hidden using the "scroll" icon on the NPC sheet
- NPCs also display Passions and Devotions
- Each section in the NPC sheet can be expanded or collapsed, and there are "collapse all" and "expand all" icons at the top
- When an NPC sheet is locked - the powers, passions, devotions and equipment sections are only shown if they have items.  Unlock the sheet to see all the sections
- Most display settings options have been removed as they do not work.  This may be revisited in future.  The Single Colour Bar option remains.
- When making damage rolls (either directly or as follow on from combat) you can enter a damage bonus value that is added to the rolled result
- You can now drag a weapon to the hotbar which generates a combat roll macro
- Move Quietly penalty for worn armour is now automatically applied to the skill rolls if the skill has the CID "i.skill.move-quietly".  If appropriate the penalty is shown in the chat card detail
- Fixed a bug on NPCs and rolls where skill value was returning Not a Number due to missing ENC Penalty
- When making a damage roll following a combat roll with two parties the system knows who the target is and therefore will offer the person rolling damage the option to roll the hit location of the target that's struck.

## 13.12
- Skill now have a main name as well as a specialisation name (if appropriate) and the skill name is created automatically from these.
- There is a migration script to update all skills in the game world, on actors or tokens.  PLEASE BACKUP YOUR WORLD BEFORE UPDATING THIS
- There is no migration for compendia - you may want to import your compendia in to the game world before doing the update.
- Although Dedication Points (now renamed from Devotion Points - oops) are changed with a drop down menu showing 0-3 DP, the value selected will be capped based on the relevant Worship skill
- You can no longer alter the DP from the DP item sheet - it can only be done from the character sheet.

## 13.11
-  Changed default journal font colour so it is visible in Dark Mode
-  You can manually add <div class="aovJnl"> at the start of a journal and </div> at the end to use some inbuilt format options that look like the rulebook (see the aov-journal.css file for what's available)


## 13.10
-  Fixing a bug whereby characters suddenly had Characteristic values of 0 even though the stats tab showed values
-  Migration sript adds character formulae and min/max values
-  Newly created characters will have base formula and min/max values added
-  Unlocking the characters sheet will let you edit these
-  My apologies for introducing the bug

## 13.9
-  Effects are now excluded from the XP roll target
-  XP Improvement rolls can now only be made once per character per Development Phase (the icon will grey out if rolls have already been made)
-  You can now make a skill training, research and characteristic rolls under the Development Phase
-  Ship sheets now have the proper background in Dark Mode so they are readable
-  Newly created actors and items now have different default icons to help identify what you are looking at
-  Family members relationship has been changed to a drop down menu rather than free text. Spouse ties in with family rolls under Victory Sacrifice

## 13.8
-  Devotions now have the option to add a skill to them so that the relevant worship skill is added/set during character creation or if devotion added to character sheet
-  Fixed an issue with current HP calculation
-  Family members now have a dependents flag - do they count towards Skyr consumption
-  Added Character Creation game settings that set options to roll stats and whether gender is binary (selected) or free text.
-  Farms now have individual data points for sheep, horses and cattle rather than just one text box (it is now on the GM tab and will be removed in due course)
-  An additional GM Tool added  - applies natural healing to all characters (even if player not logged on)
-  ENC Penalties are calculated (check tooltip on ENC and MOV) and penalties are applied automatically to MOV and relevant skill rolls

## 13.7
-  Fixed an issue where dice rolls weren't matching results on opposed/resistance/augment cards
-  Critical damage now causes maximum "special damage" + rolled damage bonus
-  Combat rolls have been added, along with fumble and damage rolls
-  There are special instructions on the wiki about how to add Dodge rolls to a combat roll
-  When mutliple parties roll dice in one roll (e.g. combat) and Dice So Nice is used the colours of the dice should match the user who initiated the roll
-  It is important the you use Chaosium IDs 'i.skill.dodge' and 'rt..fumbles' for the Dodge Skill and Fumble table respectively.

## 13.6
-  Added Fixed Resistance Rolls for Characteristics (i.e. againt Poison rather than a character or NPC characteristic)
-  Opposed rolls for Skills and Passions added
-  Augmented rolls for Skills and Passions added
-  NPC "Notes" have been moved from their own tab to below the equipment
-  Some small tweaks to layout of certain areas (e.g. Status/Rep/ENC on the character sheet or NPC Weapon Layout)
-  Some small tweaks to abbrevations e.g. DB becomes DM (Damage Modifer) or MR becomes MOV
-  Weapons now have a selectable "Damage Modifier Type" - this will always be updated when you change the Weapon Type but you can then override it.  A migration script will update this for existing in world actors/items - but not for compendia
-  Actor and Item sheets have a lighter background to provide better contrast with the text colours

## 13.5
-  Actor and Item sheets are now resizeable
-  You can now make unopposed Characteristic, Skill and Pssion rolls from Characters and NPCs (opposed rolls etc will follow in due course)
-  You can also make weapon damage rolls from Characters and NPCs
-  Expand the Roll Result Chat Cards to see more information about the roll
-  You can drag Skills and Passions from characters to the macro hotbar and use these to trigger those rolls

## 13.4
-  There are now some NPC options on the Base Stats Tab (e.g. Beserker)
-  These determine whether the NPC can have these statuses
-  Toggling the actual status on/off (e.g. actually going beserk) is done from the main NPC tab (only visible if the option is toggled on)
-  Not all effects are automated (e.g. Max damage, or loss of Magic Points) but some are (e.g. Double HP)
-  There is a game settings menu for NPCs where you can determine the default behaviour when a new token is created on a scene
-  When dropping a new NPC token on a scene stats can be generated from the "Roll" or "Average" formulae on the Base Stats tab (or nothing can happen)
-  There are also icons on the NPC sheet to let you re-roll the stats
-  Fixed an issue with NPC where skills, weapons etc were being added to the NPC name
-  Character sheet combat tab now shows what type of damage bonus will be added on weapon (DB, 1/2DB or none)
-  Character sheet rune spells and sediur spells now show prepared/active spells at the top of the list
-  There is a new icon on the "stats" tab on the character sheet that will (for characters only) recalc the base scores of skills where the Base Score Option is not "fixed"

## 13.3
- Seidur spell MP costs corrected and displays the ritual casting time
- Adding a weapon no longer adds duplicate weapon skills
- If a skill has the CID for Seiður magic then you can also select the realm for the skill when it is on an actor
- Fixed the disappearing character sheet tabs in DarkMode
- Thrown Weapons now let you enter Range and not Length
- Ships now have two tabs - Ship's Log is on one and sailing speeds is on the other.
- Ships - you can now select the wind speed on the main sheet and it will display the relevant sailing speeds
- You can now toggle runescripts on/off as prepared from either the Item sheet or the Character sheet - this will impact Locked MP
- You can now toggle seidur spells on/off as active from either the Item sheet or the Character sheet - this will impact Locked MP
- Locked MP are now calculated rather than input and Max MP are reduced accordingly
- You can now record Eells of vaðmál owned on the stats tab


## 13.2
- Main font is no longer bold by default
