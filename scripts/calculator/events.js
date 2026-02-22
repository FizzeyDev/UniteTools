import { state } from './state.js';
import { updateDamages } from './damageDisplay.js';

export function setupBuffListeners() {
  const attackerBuffIds = [
    'registeelBuffAttacker', 'groudonBuffAttacker', 'rayquazaBuffAttacker',
    'xattackBuffAttacker', 'blisseyUltBuffAttacker', 'blisseyHandBuffAttacker',
    'mimeSwapBuffAttacker', 'mimeSwapPlusBuffAttacker', 'alcreamieBuffAttacker',
    'miraidonBuffAttacker'
  ];

  attackerBuffIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', (e) => {
        switch (id) {
          case 'registeelBuffAttacker': state.attackerRegisteelBuff = e.target.checked; break;
          case 'groudonBuffAttacker': state.attackerGroudonBuff = e.target.checked; break;
          case 'rayquazaBuffAttacker': state.attackerRayquazaBuff = e.target.checked; break;
          case 'xattackBuffAttacker': state.attackerXAttackBuff = e.target.checked; break;
          case 'blisseyUltBuffAttacker': state.attackerBlisseyUltBuff = e.target.checked; break;
          case 'blisseyHandBuffAttacker': state.attackerBlisseyHandBuff = e.target.checked; break;
          case 'mimeSwapBuffAttacker': state.attackerMimeSwapBuff = e.target.checked; break;
          case 'mimeSwapPlusBuffAttacker': state.attackerMimeSwapPlusBuff = e.target.checked; break;
          case 'alcreamieBuffAttacker': state.attackerAlcreamieBuff = e.target.checked; break;
          case 'miraidonBuffAttacker': state.attackerMiraidonBuff = e.target.checked; break;
        }
        updateDamages();
      });
    }
  });

  const defenderBuffIds = [
    'regirockBuffDefender', 'eldegossBuffDefender', 'ninetailsBuffDefender',
    'ninetailsPlusBuffDefender', 'umbreonBuffDefender', 'umbreonPlusBuffDefender',
    'blisseyRedirectionBuffDefender', 'hoohRedirectionBuffDefender'
  ];

  defenderBuffIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', (e) => {
        switch (id) {
          case 'regirockBuffDefender': state.defenderRegirockBuff = e.target.checked; break;
          case 'eldegossBuffDefender': state.defenderEldegossBuff = e.target.checked; break;
          case 'ninetailsBuffDefender': state.defenderNinetailsBuff = e.target.checked; break;
          case 'ninetailsPlusBuffDefender': state.defenderNinetailsPlusBuff = e.target.checked; break;
          case 'umbreonBuffDefender': state.defenderUmbreonBuff = e.target.checked; break;
          case 'umbreonPlusBuffDefender': state.defenderUmbreonPlusBuff = e.target.checked; break;
          case 'blisseyRedirectionBuffDefender': state.defenderBlisseyRedirectionBuff = e.target.checked; break;
          case 'hoohRedirectionBuffDefender': state.defenderHoOhRedirectionBuff = e.target.checked; break;
        }
        updateDamages();
      });
    }
  });
}

export function setupDebuffListeners() {
  const attackerDebuffIds = [
    'buzzwoleLungeDebuffAttacker',
    'charizardBurnDebuffAttacker',
    'cinderaceBurnDebuffAttacker',
    'cramorantFeatherDanceDebuffAttacker',
    'dodrioTriAttackFlameDebuffAttacker',
    'dodrioTriAttackFlameSprintDebuffAttacker',
    'gengarWillOWispDebuffAttacker',
    'slowbroScaldDebuffAttacker',
    'sylveonBabyDollEyesDebuffAttacker',
    'sylveonMysticalFireDebuffAttacker',
    'trevenantWillOWispDebuffAttacker',
    'tsareenaTropKickDebuffAttacker',
    'goodraMuddyWaterDebuffAttacker',
    'mimePowerSwapDebuffAttacker',
    'mimePowerSwapPlusDebuffAttacker',
    'trevenantWoodHammerPlusDebuffAttacker',
    'umbreonSnarlDebuffAttacker',
    'umbreonSnarlFinalHitDebuffAttacker',
    'inteleonTearfulLookDebuffAttacker',
    'hoohFlamethrowerDebuffAttacker',
    'hoohSacredFireDebuffAttacker',
    'hoohSacredFirePlusDebuffAttacker',
    'psyduckSurfPlusDebuffAttacker',
    'psyduckUniteDebuffAttacker',
    'tinkatonIceHammerDebuffAttacker',
    'tinkatonIceHammerPlusDebuffAttacker',
    'alcremieCharmDebuffAttacker',
    'latiasMistBallDebuffAttacker'
  ];

  attackerDebuffIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', (e) => {
        switch (id) {
          case 'buzzwoleLungeDebuffAttacker': state.debuffBuzzwoleLunge = e.target.checked; break;
          case 'charizardBurnDebuffAttacker': state.debuffCharizardBurn = e.target.checked; break;
          case 'cinderaceBurnDebuffAttacker': state.debuffCinderaceBurn = e.target.checked; break;
          case 'cramorantFeatherDanceDebuffAttacker': state.debuffCramorantFeatherDance = e.target.checked; break;
          case 'dodrioTriAttackFlameDebuffAttacker': state.debuffDodrioTriAttackFlame = e.target.checked; break;
          case 'dodrioTriAttackFlameSprintDebuffAttacker': state.debuffDodrioTriAttackFlameSprint = e.target.checked; break;
          case 'gengarWillOWispDebuffAttacker': state.debuffGengarWillOWisp = e.target.checked; break;
          case 'slowbroScaldDebuffAttacker': state.debuffSlowbroScald = e.target.checked; break;
          case 'sylveonBabyDollEyesDebuffAttacker': state.debuffSylveonBabyDollEyes = e.target.checked; break;
          case 'sylveonMysticalFireDebuffAttacker': state.debuffSylveonMysticalFire = e.target.checked; break;
          case 'trevenantWillOWispDebuffAttacker': state.debuffTrevenantWillOWisp = e.target.checked; break;
          case 'tsareenaTropKickDebuffAttacker': state.debuffTsareenaTropKick = e.target.checked; break;
          case 'goodraMuddyWaterDebuffAttacker': state.debuffGoodraMuddyWater = e.target.checked; break;
          case 'mimePowerSwapDebuffAttacker': state.debuffMimePowerSwap = e.target.checked; break;
          case 'mimePowerSwapPlusDebuffAttacker': state.debuffMimePowerSwapPlus = e.target.checked; break;
          case 'trevenantWoodHammerPlusDebuffAttacker': state.debuffTrevenantWoodHammerPlus = e.target.checked; break;
          case 'umbreonSnarlDebuffAttacker': state.debuffUmbreonSnarl = e.target.checked; break;
          case 'umbreonSnarlFinalHitDebuffAttacker': state.debuffUmbreonSnarlFinalHit = e.target.checked; break;
          case 'inteleonTearfulLookDebuffAttacker': state.debuffInteleonTearfulLook = e.target.checked; break;
          case 'hoohFlamethrowerDebuffAttacker': state.debuffHoohFlamethrower = e.target.checked; break;
          case 'hoohSacredFireDebuffAttacker': state.debuffHoohSacredFire = e.target.checked; break;
          case 'hoohSacredFirePlusDebuffAttacker': state.debuffHoohSacredFirePlus = e.target.checked; break;
          case 'psyduckSurfPlusDebuffAttacker': state.debuffPsyduckSurfPlus = e.target.checked; break;
          case 'psyduckUniteDebuffAttacker': state.debuffPsyduckUnite = e.target.checked; break;
          case 'tinkatonIceHammerDebuffAttacker': state.debuffTinkatonIceHammer = e.target.checked; break;
          case 'tinkatonIceHammerPlusDebuffAttacker': state.debuffTinkatonIceHammerPlus = e.target.checked; break;
          case 'alcremieCharmDebuffAttacker': state.debuffAlcremieCharm = e.target.checked; break;
          case 'latiasMistBallDebuffAttacker': state.debuffLatiasMistBall = e.target.checked; break;
        }
        updateDamages();
      });
    }
  });

  const defenderDebuffIds = [
    'absolBoostedDebuffDefender',
    'cramorantBoostedGulpMissileDebuffDefender',
    'decidueyeShadowSneakDebuffDefender',
    'decidueyeShadowSneakPlusDebuffDefender',
    'gardevoirBoostedDebuffDefender',
    'gardevoirPsychicDebuffDefender',
    'gengarShadowBallDebuffDefender',
    'glaceonTailWhipDebuffDefender',
    'hoopaShadowBallDebuffDefender',
    'mimePsychicDebuffDefender',
    'slowbroObliviousDebuffDefender',
    'sylveonHyperVoiceDebuffDefender',
    'tsareenaBoostedDebuffDefender',
    'urshifuLiquidationDebuffDefender',
    'venusaurSludgeBombDebuffDefender',
    'wigglytuffSingDebuffDefender',
    'umbreonFakeTearsDebuffDefender',
    'mewtwoXUniteDebuffDefender',
    'mewtwoYUniteDebuffDefender',
    'ceruledgePsychoCutDebuffDefender',
    'ceruledgePsychoCutPlusDebuffDefender',
    'tinkatonThiefDebuffDefender',
    'tinkatonThiefPlusDebuffDefender',
    'psyduckTailWhipDebuffDefender',
    'psyduckTailWhipMysteriousDebuffDefender',
    'psyduckPsychicPlusDebuffDefender',
    'alolanRaichuStoredPowerPlusDebuffDefender',
    'latiasDragonBreathDebuffDefender',
    'empoleonAquaJetTorrentDebuffDefender',
    'dhelmiseAnchorShotPlusDebuffDefender'
  ];

  defenderDebuffIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', (e) => {
        switch (id) {
          case 'absolBoostedDebuffDefender': state.defenderAbsolBoosted = e.target.checked; break;
          case 'cramorantBoostedGulpMissileDebuffDefender': state.defenderCramorantBoostedGulpMissile = e.target.checked; break;
          case 'decidueyeShadowSneakDebuffDefender': state.defenderDecidueyeShadowSneak = e.target.checked; break;
          case 'decidueyeShadowSneakPlusDebuffDefender': state.defenderDecidueyeShadowSneakPlus = e.target.checked; break;
          case 'gardevoirBoostedDebuffDefender': state.defenderGardevoirBoosted = e.target.checked; break;
          case 'gardevoirPsychicDebuffDefender': state.defenderGardevoirPsychic = e.target.checked; break;
          case 'gengarShadowBallDebuffDefender': state.defenderGengarShadowBall = e.target.checked; break;
          case 'glaceonTailWhipDebuffDefender': state.defenderGlaceonTailWhip = e.target.checked; break;
          case 'hoopaShadowBallDebuffDefender': state.defenderHoopaShadowBall = e.target.checked; break;
          case 'mimePsychicDebuffDefender': state.defenderMimePsychic = e.target.checked; break;
          case 'slowbroObliviousDebuffDefender': state.defenderSlowbroOblivious = e.target.checked; break;
          case 'sylveonHyperVoiceDebuffDefender': state.defenderSylveonHyperVoice = e.target.checked; break;
          case 'tsareenaBoostedDebuffDefender': state.defenderTsareenaBoosted = e.target.checked; break;
          case 'urshifuLiquidationDebuffDefender': state.defenderUrshifuLiquidation = e.target.checked; break;
          case 'venusaurSludgeBombDebuffDefender': state.defenderVenusaurSludgeBomb = e.target.checked; break;
          case 'wigglytuffSingDebuffDefender': state.defenderWigglytuffSing = e.target.checked; break;
          case 'umbreonFakeTearsDebuffDefender': state.defenderUmbreonFakeTears = e.target.checked; break;
          case 'mewtwoXUniteDebuffDefender': state.defenderMewtwoXUnite = e.target.checked; break;
          case 'mewtwoYUniteDebuffDefender': state.defenderMewtwoYUnite = e.target.checked; break;
          case 'ceruledgePsychoCutDebuffDefender': state.defenderCeruledgePsychoCut = e.target.checked; break;
          case 'ceruledgePsychoCutPlusDebuffDefender': state.defenderCeruledgePsychoCutPlus = e.target.checked; break;
          case 'tinkatonThiefDebuffDefender': state.defenderTinkatonThief = e.target.checked; break;
          case 'tinkatonThiefPlusDebuffDefender': state.defenderTinkatonThiefPlus = e.target.checked; break;
          case 'psyduckTailWhipDebuffDefender': state.defenderPsyduckTailWhip = e.target.checked; break;
          case 'psyduckTailWhipMysteriousDebuffDefender': state.defenderPsyduckTailWhipMysterious = e.target.checked; break;
          case 'psyduckPsychicPlusDebuffDefender': state.defenderPsyduckPsychicPlus = e.target.checked; break;
          case 'alolanRaichuStoredPowerPlusDebuffDefender': state.defenderAlolanRaichuStoredPowerPlus = e.target.checked; break;
          case 'latiasDragonBreathDebuffDefender': state.defenderLatiasDragonBreath = e.target.checked; break;
          case 'empoleonAquaJetTorrentDebuffDefender': state.defenderEmpoleonAquaJetTorrent = e.target.checked; break;
          case 'dhelmiseAnchorShotPlusDebuffDefender': state.defenderDhelmiseAnchorShotPlus = e.target.checked; break;
        }
        updateDamages();
      });
    }
  });
}

export function setupStackableDebuffs() {
  const attackerStackable = {
    'umbreonSnarlDebuffAttacker':       { max: 6, stateKey: 'umbreonSnarlStacks' },
    'sylveonMysticalFireDebuffAttacker': { max: 4, stateKey: 'sylveonMysticalFireStacks' }
  };

  const defenderStackable = {
    'gardevoirPsychicDebuffDefender':         { max: 3,  stateKey: 'gardevoirPsychicStacks' },
    'mimePsychicDebuffDefender':              { max: 8,  stateKey: 'mimePsychicStacks' },
    'slowbroObliviousDebuffDefender':         { max: 5,  stateKey: 'slowbroObliviousStacks' },
    'sylveonHyperVoiceDebuffDefender':        { max: 4,  stateKey: 'sylveonHypervoiceStacks' },
    'alolanRaichuStoredPowerPlusDebuffDefender': { max: 3, stateKey: 'raichuStoredpowerStacks' }
  };

  const allStackable = { ...attackerStackable, ...defenderStackable };

  Object.entries(allStackable).forEach(([id, config]) => {
    const checkbox = document.getElementById(id);
    if (!checkbox) return;

    const label = checkbox.parentElement;

    const stacksContainer = document.createElement('div');
    stacksContainer.className = 'ability-stacks-container';
    stacksContainer.style.marginLeft = '28px';
    stacksContainer.style.marginTop = '6px';
    stacksContainer.style.display = 'none';

    stacksContainer.innerHTML = `
      <div class="ability-stack-control">
        <button class="stack-btn minus">-</button>
        <span class="stack-value">0</span>
        <button class="stack-btn plus">+</button>
        <span class="stack-max">/${config.max}</span>
      </div>
    `;

    label.appendChild(stacksContainer);

    let currentStacks = 0;

    const updateStacks = () => {
      state[config.stateKey] = currentStacks;
      updateDamages();
    };

    checkbox.addEventListener('change', () => {
      stacksContainer.style.display = checkbox.checked ? 'block' : 'none';
      if (!checkbox.checked) {
        currentStacks = 0;
        stacksContainer.querySelector('.stack-value').textContent = '0';
        updateStacks();
      }
    });

    stacksContainer.querySelector('.minus').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentStacks > 0) {
        currentStacks--;
        stacksContainer.querySelector('.stack-value').textContent = currentStacks;
        updateStacks();
      }
    });

    stacksContainer.querySelector('.plus').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentStacks < config.max) {
        currentStacks++;
        stacksContainer.querySelector('.stack-value').textContent = currentStacks;
        updateStacks();
      }
    });
  });
}