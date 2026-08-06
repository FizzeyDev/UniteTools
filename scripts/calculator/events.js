import { state } from './state.js';
import { updateDamages } from './damageDisplay.js';

export function setupBuffListeners() {
  const attackerBuffIds = [
    'registeelBuffAttacker', 'groudonBuffAttacker', 'rayquazaBuffAttacker',
    'xattackBuffAttacker', 'blisseyUltBuffAttacker', 'blisseyHandBuffAttacker',
    'mimeSwapBuffAttacker', 'mimeSwapPlusBuffAttacker', 'alcreamieBuffAttacker',
    'miraidonBuffAttacker', 'skeledirgeBuffAttacker'
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
          case 'skeledirgeBuffAttacker': state.attackerSkeledirgeBuff = e.target.checked; break;
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
    'latiasMistBallDebuffAttacker',
    'meganiumSynthesisDebuffAttacker',
    'meganiumFullBloomAromaDebuffAttacker'
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
          case 'meganiumSynthesisDebuffAttacker': state.debuffMeganiumSynthesis = e.target.checked; break;
          case 'meganiumFullBloomAromaDebuffAttacker': state.debuffMeganiumFullBloomAroma = e.target.checked; break;
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
    'quaquavalLiquidationDebuffDefender',
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
          case 'quaquavalLiquidationDebuffDefender': state.defenderQuaquavalLiquidation = e.target.checked; break;
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
    'umbreonSnarlDebuffAttacker':       { max: 6, stateKey: 'umbreonSnarlStacks', maxStateKey: 'umbreonSnarlStacksMax',
      compute: n => `-${Math.round((1 - Math.pow(0.97, n)) * 100)}% Atk & Sp. Atk` },
    'sylveonMysticalFireDebuffAttacker': { max: 4, stateKey: 'sylveonMysticalFireStacks', maxStateKey: 'sylveonMysticalFireStacksMax',
      compute: n => `-${Math.round((1 - Math.pow(0.85, n)) * 100)}% Sp. Atk` }
  };

  const defenderStackable = {
    'gardevoirPsychicDebuffDefender':         { max: 3,  stateKey: 'gardevoirPsychicStacks',    maxStateKey: 'gardevoirPsychicStacksMax',
      compute: n => `-${Math.round((1 - Math.pow(0.73, n)) * 100)}% Sp. Def` },
    'mimePsychicDebuffDefender':              { max: 8,  stateKey: 'mimePsychicStacks',         maxStateKey: 'mimePsychicStacksMax',
      compute: n => `-${Math.round((1 - Math.pow(0.95, n)) * 100)}% Sp. Def` },
    'slowbroObliviousDebuffDefender':         { max: 5,  stateKey: 'slowbroObliviousStacks',    maxStateKey: 'slowbroObliviousStacksMax',
      compute: n => `-${Math.round((1 - Math.pow(0.96, n)) * 100)}% Sp. Def` },
    'sylveonHyperVoiceDebuffDefender':        { max: 4,  stateKey: 'sylveonHypervoiceStacks',   maxStateKey: 'sylveonHypervoiceStacksMax',
      compute: n => `-${Math.round((1 - Math.pow(0.80, n)) * 100)}% Sp. Def` },
    'alolanRaichuStoredPowerPlusDebuffDefender': { max: 3, stateKey: 'raichuStoredpowerStacks', maxStateKey: 'raichuStoredpowerStacksMax',
      compute: n => `-${Math.round((1 - Math.pow(0.95, n)) * 100)}% Sp. Def` }
  };

  // ── Débuffs dont la magnitude dépend du NIVEAU du Pokémon qui inflige le debuff ──
  // (et non du niveau du Pokémon défenseur qui le subit)
  const defenderCasterLevel = {
    'ceruledgePsychoCutDebuffDefender':     { type: 'level', min: 1, max: 15, default: 15, stateKey: 'defenderCeruledgePsychoCutCasterLevel',
      compute: lvl => `-${10 + 2 * (lvl - 1)} Def` },
    'ceruledgePsychoCutPlusDebuffDefender': { type: 'level', min: 1, max: 15, default: 15, stateKey: 'defenderCeruledgePsychoCutPlusCasterLevel',
      compute: lvl => `-${15 + 3 * (lvl - 1)} Def` },
    'gengarShadowBallDebuffDefender':       { type: 'level', min: 1, max: 15, default: 15, stateKey: 'defenderGengarShadowBallCasterLevel',
      compute: lvl => `-${80 + 5 * (lvl - 1)} Sp. Def` },
  };

  const allStackable = { ...attackerStackable, ...defenderStackable, ...defenderCasterLevel };

  Object.entries(allStackable).forEach(([id, config]) => {
    const checkbox = document.getElementById(id);
    if (!checkbox) return;

    const isLevelType = config.type === 'level';
    const min = config.min ?? 0;
    let max = isLevelType ? config.max : (state[config.maxStateKey] ?? config.max);
    const initial = isLevelType ? (config.default ?? 15) : 0;

    const label = checkbox.parentElement;

    const stacksContainer = document.createElement('div');
    stacksContainer.className = 'ability-stacks-container';
    stacksContainer.style.marginLeft = '28px';
    stacksContainer.style.marginTop = '6px';
    stacksContainer.style.display = 'none';

    stacksContainer.innerHTML = isLevelType ? `
      <div class="ability-stack-control">
        <span style="margin-right:6px;font-size:0.85em;color:#aaa;">Niveau du lanceur :</span>
        <button class="stack-btn minus">-</button>
        <span class="stack-value">${initial}</span>
        <button class="stack-btn plus">+</button>
        <span class="stack-computed" style="margin-left:10px;font-size:0.85em;color:#8fd6ff;"></span>
      </div>
    ` : `
      <div class="ability-stack-control">
        <button class="stack-btn minus">-</button>
        <span class="stack-value">0</span>
        <button class="stack-btn plus">+</button>
        /<span class="stack-max" title="Cliquer pour changer le nombre de stacks max" style="cursor:pointer;text-decoration:underline dotted;">${max}</span>
        <span class="stack-computed" style="margin-left:10px;font-size:0.85em;color:#8fd6ff;"></span>
      </div>
    `;

    label.appendChild(stacksContainer);

    let currentValue = initial;
    const computedEl = stacksContainer.querySelector('.stack-computed');

    const refreshComputed = () => {
      if (config.compute) computedEl.textContent = `→ ${config.compute(currentValue)}`;
    };

    const updateValue = () => {
      state[config.stateKey] = currentValue;
      refreshComputed();
      updateDamages();
    };

    checkbox.addEventListener('change', () => {
      stacksContainer.style.display = checkbox.checked ? 'block' : 'none';
      if (checkbox.checked) {
        // S'assure que la valeur par défaut (ex: niveau 15) est bien poussée dans le state dès l'activation
        updateValue();
      } else if (!isLevelType) {
        currentValue = 0;
        stacksContainer.querySelector('.stack-value').textContent = '0';
        updateValue();
      }
    });

    stacksContainer.querySelector('.minus').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (currentValue > min) {
        currentValue--;
        stacksContainer.querySelector('.stack-value').textContent = currentValue;
        updateValue();
      }
    });

    stacksContainer.querySelector('.plus').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (currentValue < max) {
        currentValue++;
        stacksContainer.querySelector('.stack-value').textContent = currentValue;
        updateValue();
      }
    });

    // ── Max de stacks configurable (clic sur le nombre pour l'éditer) ──
    if (!isLevelType) {
      const attachMaxEditHandler = (el) => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const input = document.createElement('input');
          input.type = 'number';
          input.min = 1;
          input.value = max;
          input.style.width = '42px';
          input.style.fontSize = '0.9em';
          el.replaceWith(input);
          input.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
          input.addEventListener('mousedown', e => e.stopPropagation());
          input.focus();
          input.select();

          const save = () => {
            const newMax = Math.max(1, parseInt(input.value) || max);
            max = newMax;
            state[config.maxStateKey] = newMax;
            if (currentValue > max) {
              currentValue = max;
              stacksContainer.querySelector('.stack-value').textContent = currentValue;
            }
            const newMaxEl = document.createElement('span');
            newMaxEl.className = 'stack-max';
            newMaxEl.title = 'Cliquer pour changer le nombre de stacks max';
            newMaxEl.style.cursor = 'pointer';
            newMaxEl.style.textDecoration = 'underline dotted';
            newMaxEl.textContent = max;
            input.replaceWith(newMaxEl);
            attachMaxEditHandler(newMaxEl);
            updateValue();
          };

          input.addEventListener('blur', save);
          input.addEventListener('keydown', ev => { if (ev.key === 'Enter') save(); });
        });
      };
      attachMaxEditHandler(stacksContainer.querySelector('.stack-max'));
    }

    refreshComputed();
  });
}