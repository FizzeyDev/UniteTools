import { state } from './state.js';
import { highlightGridSelection } from './uiManager.js';
import { resetItems, autoEquipSpecialItem, disableItemSlots, enableItemSlots } from './itemManager.js';
import { updateDamages } from './damageDisplay.js';
import { t } from './i18n.js';

const pokemonGridAttacker = document.getElementById("pokemonGridAttacker");
const pokemonGridDefender = document.getElementById("pokemonGridDefender");

export function selectAttacker(id) {
  state.currentAttacker = state.allPokemon.find(p => p.pokemonId === id);
  if (state.currentAttacker) {
    document.getElementById('attackerName').textContent = state.currentAttacker.displayName;
    document.getElementById('attackerImage').innerHTML = `<img src="${state.currentAttacker.image}" alt="${state.currentAttacker.displayName}">`;
    document.getElementById('resultsAttackerImg').src = state.currentAttacker.image || 'assets/items/none.png';
    highlightGridSelection(pokemonGridAttacker, id);
  }

  resetItems('attacker');
  autoEquipSpecialItem('attacker', id);

  state.attackerHPPercent = 100;
  document.getElementById('hpSliderAttacker').value = 100;

  state.attackerPassiveStacks = 0;
  state.attackerStance = 'shield';
  state.attackerFlashFireActive = false;

  state.attackerRegisteelBuff = false;
  state.attackerGroudonBuff = false;
  state.attackerRayquazaBuff = false;
  state.attackerXAttackBuff = false;
  state.attackerBlisseyUltBuff = false;
  state.attackerBlisseyHandBuff = false;
  state.attackerMimeSwapBuff = false;
  state.attackerMimeSwapPlusBuff = false;
  state.attackerAlcreamieBuff = false;
  state.attackerMiraidonBuff = false;

  if (id === "mega-lucario") {
    state.attackerLucarioForm = "normal"
    state.attackerLucarioJustifiedStacks = 0
    state.attackerLucarioAdaptabilityStacks = 0
  }

  const attackerCheckboxes = [
    'registeelBuffAttacker', 'groudonBuffAttacker', 'rayquazaBuffAttacker',
    'xattackBuffAttacker', 'blisseyUltBuffAttacker', 'blisseyHandBuffAttacker',
    'mimeSwapBuffAttacker', 'mimeSwapPlusBuffAttacker', 'alcreamieBuffAttacker',
    'miraidonBuffAttacker'
  ];
  attackerCheckboxes.forEach(cid => {
    const el = document.getElementById(cid);
    if (el) el.checked = false;
  });

  resetAttackerDebuffs();
  
  const attackerDebuffCheckboxes = document.querySelectorAll('.additional-effects:nth-of-type(2) input[type="checkbox"]');
  attackerDebuffCheckboxes.forEach(cb => cb.checked = false);

  document.querySelectorAll('.ability-stacks-container').forEach(container => {
    container.style.display = 'none';
    container.querySelector('.stack-value').textContent = '0';
  });

  updateDamages();
}

export function selectDefender(id) {
  state.currentDefender = state.allPokemon.find(p => p.pokemonId === id);
  if (state.currentDefender) {
    document.getElementById('defenderName').textContent = state.currentDefender.displayName;
    document.getElementById('defenderImage').innerHTML = `<img src="${state.currentDefender.image}" alt="${state.currentDefender.displayName}">`;
    document.getElementById('resultsDefenderImg').src = state.currentDefender.image || 'assets/items/none.png';
    highlightGridSelection(pokemonGridDefender, id);
  }

  resetItems('defender');
  autoEquipSpecialItem('defender', id);

  state.defenderHPPercent = 100;
  document.getElementById('hpSliderDefender').value = 100;

  state.defenderStance = 'shield';
  state.defenderFlashFireActive = false;

  // Reset buffs
  state.defenderRegirockBuff = false;
  state.defenderEldegossBuff = false;
  state.defenderNinetailsBuff = false;
  state.defenderNinetailsPlusBuff = false;
  state.defenderUmbreonBuff = false;
  state.defenderUmbreonPlusBuff = false;
  state.defenderBlisseyRedirectionBuff = false;
  state.defenderHoOhRedirectionBuff = false;

  const defenderCheckboxes = [
    'regirockBuffDefender', 'eldegossBuffDefender', 'ninetailsBuffDefender',
    'ninetailsPlusBuffDefender', 'umbreonBuffDefender', 'umbreonPlusBuffDefender',
    'blisseyRedirectionBuffDefender', 'hoohRedirectionBuffDefender'
  ];
  defenderCheckboxes.forEach(cid => {
    const el = document.getElementById(cid);
    if (el) el.checked = false;
  });

  // Reset debuffs
  resetDefenderDebuffs();

  const isMobOrDoll = state.currentDefender?.category === 'mob' || id === 'substitute-doll';
  if (isMobOrDoll) {
    disableItemSlots('defender');
  } else {
    enableItemSlots('defender');
  }

  const isCustom = id === 'custom-doll';
  document.getElementById('defenderDefNormal').style.display = isCustom ? 'none' : 'block';
  document.getElementById('defenderSpDefNormal').style.display = isCustom ? 'none' : 'block';

  const customRows = document.querySelectorAll('.custom-stat');
  customRows.forEach(row => row.style.display = isCustom ? 'block' : 'none');

  if (isCustom && state.currentDefender.customStats) {
    document.getElementById('defenderMaxHP').textContent = state.currentDefender.customStats.hp.toLocaleString();
    document.getElementById('defenderDefCustom').textContent = state.currentDefender.customStats.def.toLocaleString();
    document.getElementById('defenderSpDefCustom').textContent = state.currentDefender.customStats.sp_def.toLocaleString();
  }

  if (isCustom) {
    let hint = document.getElementById('customDollHint');
    if (!hint) {
      hint = document.createElement('p');
      hint.id = 'customDollHint';
      hint.className = 'custom-doll-hint';
      hint.textContent = t('calc_custom_doll_hint');
      document.querySelector('.defender-stats .stats-grid').prepend(hint);
    }
    hint.style.display = 'block';
  } else {
    const hint = document.getElementById('customDollHint');
    if (hint) hint.style.display = 'none';
  }

  updateDamages();
}

function resetAttackerDebuffs() {
  state.debuffBuzzwoleLunge = false;
  state.debuffCharizardBurn = false;
  state.debuffCinderaceBurn = false;
  state.debuffCramorantFeatherDance = false;
  state.debuffDodrioTriAttackFlame = false;
  state.debuffDodrioTriAttackFlameSprint = false;
  state.debuffGengarWillOWisp = false;
  state.debuffSlowbroScald = false;
  state.debuffSylveonBabyDollEyes = false;
  state.debuffSylveonMysticalFire = false;
  state.debuffTrevenantWillOWisp = false;
  state.debuffTsareenaTropKick = false;
  state.debuffGoodraMuddyWater = false;
  state.debuffMimePowerSwap = false;
  state.debuffMimePowerSwapPlus = false;
  state.debuffTrevenantWoodHammerPlus = false;
  state.debuffUmbreonSnarl = false;
  state.debuffUmbreonSnarlFinalHit = false;
  state.debuffInteleonTearfulLook = false;
  state.debuffHoohFlamethrower = false;
  state.debuffHoohSacredFire = false;
  state.debuffHoohSacredFirePlus = false;
  state.debuffPsyduckSurfPlus = false;
  state.debuffPsyduckUnite = false;
  state.debuffTinkatonIceHammer = false;
  state.debuffTinkatonIceHammerPlus = false;
  state.debuffAlcremieCharm = false;
  state.debuffLatiasMistBall = false;

  state.umbreonSnarlStacks = 0;
  state.sylveonMysticalFireStacks = 0;
}

function resetDefenderDebuffs() {
  state.defenderAbsolBoosted = false;
  state.defenderCramorantBoostedGulpMissile = false;
  state.defenderDecidueyeShadowSneak = false;
  state.defenderDecidueyeShadowSneakPlus = false;
  state.defenderGardevoirBoosted = false;
  state.defenderGardevoirPsychic = false;
  state.defenderGengarShadowBall = false;
  state.defenderGlaceonTailWhip = false;
  state.defenderHoopaShadowBall = false;
  state.defenderMimePsychic = false;
  state.defenderSlowbroOblivious = false;
  state.defenderSylveonHyperVoice = false;
  state.defenderTsareenaBoosted = false;
  state.defenderUrshifuLiquidation = false;
  state.defenderVenusaurSludgeBomb = false;
  state.defenderWigglytuffSing = false;
  state.defenderUmbreonFakeTears = false;
  state.defenderMewtwoXUnite = false;
  state.defenderMewtwoYUnite = false;
  state.defenderCeruledgePsychoCut = false;
  state.defenderCeruledgePsychoCutPlus = false;
  state.defenderTinkatonThief = false;
  state.defenderTinkatonThiefPlus = false;
  state.defenderPsyduckTailWhip = false;
  state.defenderPsyduckTailWhipMysterious = false;
  state.defenderPsyduckPsychicPlus = false;
  state.defenderAlolanRaichuStoredPowerPlus = false;
  state.defenderLatiasDragonBreath = false;
  state.defenderEmpoleonAquaJetTorrent = false;
  state.defenderDhelmiseAnchorShotPlus = false;

  state.gardevoirPsychicStacks = 0;
  state.mimePsychicStacks = 0;
  state.slowbroObliviousStacks = 0;
  state.sylveonHypervoiceStacks = 0;
  state.raichuStoredpowerStacks = 0;
}