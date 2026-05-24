let WS_POKEMON = [];

async function wsLoadData() {
  const res  = await fetch('data/pokemons.json');
  const data = await res.json();
  const seenEn = new Set();
  const seenFr = new Set();

  WS_POKEMON = data.reduce((acc, p) => {
    const en = p.name;
    const fr = p.name_fr;
    if (seenEn.has(en) || seenFr.has(fr)) return acc;
    seenEn.add(en);
    seenFr.add(fr);
    acc.push({ en, fr });
    return acc;
  }, []);

  document.dispatchEvent(new CustomEvent('wsDataReady'));
}

wsLoadData();