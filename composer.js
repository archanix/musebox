
    // ---- v4.24 Composer 2 (engine: 2), aşama 1: omurga ----
    // Fikir: şarkı "şans" ile değil niyetle bestelenir.
    //  1) Gerilim eğrisi (bar başına 0–1) hikâyenin omurgasıdır: bölüm türünden gelir; akor seçimi, melodi aralığı ve yoğunluk onu izler.
    //  2) Her barın kendi akoru vardır: kök (tonikten yarım ton) + akor-gamı (7 sesli yerel gam). Notalar bu akor-gamında dereceyle yazılır
    //     (0,2,4,6 = akor sesleri) → ödünç akor, dominant, azaltılmış, tritone ikamesi gibi gam dışı renkler mümkün.
    //  3) Armoni = arama: gerilim hedefine, akor geçiş gücüne, ortak seslere, kadansa göre ışın araması (beam search); en iyi birkaçından tohumlu seçim.
    //  4) Melodi = motif genomu: şarkıda 1–2 motif hücresi doğar, frazlar bunların dönüşümleridir (sekans, ters çevirme, büyütme, parçalama);
    //     perdeleri bar akoruna göre dinamik programlama (Viterbi) seçer: güçlü vuruşta akor sesi, adım hareketi, sıçrama sonrası denge, kadans.
    //  5) Pad ses geçişli (voice leading), bas yaklaşma notalı, nota uzunluğu ve vuruş şiddeti şarkı dinamiğine göre (len/vel üstüne yazmaları).
    // Eski motor dondurulmuştur (engine yok = klasik); composeV2 yalnız engine 2'de çalışır, ana rng akışına dokunmaz.
    const V2_Q = {
      min_aeo: [0, 2, 3, 5, 7, 8, 10], min_dor: [0, 2, 3, 5, 7, 9, 10], min_phr: [0, 1, 3, 5, 7, 8, 10],
      maj_ion: [0, 2, 4, 5, 7, 9, 11], maj_lyd: [0, 2, 4, 6, 7, 9, 11],
      dom_mix: [0, 2, 4, 5, 7, 9, 10], dom_lyd: [0, 2, 4, 6, 7, 9, 10], dom_b9: [0, 1, 4, 5, 7, 8, 10], dom_alt: [0, 1, 3, 4, 6, 8, 10],
      hdim: [0, 1, 3, 5, 6, 8, 10], dim7: [0, 2, 3, 5, 6, 8, 9], sus4: [0, 2, 5, 6, 7, 9, 10]
    };
    const V2_CHANNELS = ['Bass', 'SubBass', 'Lead', 'SubLead', 'Arp', 'Keys', 'Pad'];
    const V2_DRUMS = ['Kick', 'Snare', 'HiHat'], V2_ALL = V2_CHANNELS.concat(V2_DRUMS);
    const V2_GROUP = { Lead: 'Lead', SubLead: 'Lead', Bass: 'Bass', SubBass: 'Bass', Arp: 'Arp', Keys: 'Keys', Pad: 'Pad', Kick: 'Drums', Snare: 'Drums', HiHat: 'Drums' };
    // ---- Ritim motoru v1: tür ailesine göre groove şablonu, bölüm ve enerjiye bağlı yoğunluk, faz sonu fill'leri, hayalet notalar, buildup roll'ü, drop öncesi nefes ----
    // Davul grubu (Kick, Snare, HiHat) birlikte bestelenir (uyumlu groove); bas, kick'e kilitlenir (vuruşları kick konumlarından türer).
    const V2_GROOVE = {
      synthwave: { kick: [[0, 8], [0, 8, 14], [0, 6, 8], [0, 4, 8, 12]], snare: [[4, 12]], hat: 'eighth', ghost: 0, fill: 0.5 },
      cyberpunk: { kick: [[0, 6, 10], [0, 3, 8, 11], [0, 6, 8, 10], [0, 5, 10, 13]], snare: [[4, 12], [4, 10, 12]], hat: 'gaps', ghost: 0.25, fill: 0.7 },
      lofi: { kick: [[0, 7, 10], [0, 5, 10], [0, 7, 9, 14]], snare: [[4, 12]], hat: 'light', ghost: 0.55, fill: 0.25 },
      ambient: { kick: [[0], [0, 8]], snare: [], hat: 'quarter', ghost: 0, fill: 0.08 },
      synthpop: { kick: [[0, 4, 8, 12], [0, 8, 10], [0, 6, 8]], snare: [[4, 12]], hat: 'eighth', ghost: 0, fill: 0.4 }
    };
    const V2_FILLS = [{ sn: [10, 12, 13, 14, 15], ki: [8] }, { sn: [12, 14, 15], ki: [13] }, { sn: [12, 14], ki: [11, 13, 15] }, { sn: [8, 9, 10, 11, 12, 13, 14, 15], ki: [] }];
    const V2_STYLE = {
      synthwave: { flavor: 'dark', leg: 0.55, dens: 1.0, sync: 0.35, hookHigh: 1, bassMove: 0.4 },
      cyberpunk: { flavor: 'dark', leg: 0.5, dens: 1.15, sync: 0.55, hookHigh: 1, bassMove: 0.55 },
      lofi: { flavor: 'jazzy', leg: 0.95, dens: 0.7, sync: 0.7, hookHigh: 0, bassMove: 0.6 },
      ambient: { flavor: 'dark', leg: 1.6, dens: 0.45, sync: 0.2, hookHigh: 0, bassMove: 0.15 },
      synthpop: { flavor: 'pop', leg: 0.6, dens: 1.0, sync: 0.4, hookHigh: 1, bassMove: 0.35 }
    };
    const V2_RHY = {
      sparse: [[0, 6, 10], [2, 6, 12], [0, 5, 8, 13], [3, 8, 14], [0, 7, 10], [2, 8, 11]],
      mid: [[0, 3, 6, 10], [0, 4, 6, 10, 12], [2, 6, 8, 12, 14], [0, 3, 8, 11], [0, 6, 8, 14], [0, 3, 6, 8, 11, 14], [0, 2, 6, 10, 12]],
      dense: [[0, 2, 4, 6, 8, 10, 12, 14], [0, 3, 4, 7, 8, 11, 12, 14], [0, 2, 3, 6, 8, 10, 11, 14], [0, 1, 4, 6, 8, 9, 12, 14]]
    };
    const v2mod7 = d => ((d % 7) + 7) % 7, v2clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const v2Pitch = (c, d) => c.r + V2_Q[c.q][v2mod7(d)] + 12 * Math.floor(d / 7); // tonikten yarım ton
    function v2Freq(root, scale, baseOct, c, d) { return resolveAbsoluteDegreeFreq(root, scale, baseOct, 0) * Math.pow(2, v2Pitch(c, d) / 12); }
    function v2Chord(p, bar) { const cs = p && p.v2 && p.v2.chords; return (cs && cs.length) ? cs[bar % cs.length] : null; }
    const v2Tones = c => [0, 2, 4, 6].map(i => ((c.r + V2_Q[c.q][i]) % 12 + 12) % 12);

    function v2Vocab(scale, flavor) { // akor sözlüğü: id, kök (yarım ton), kalite, gerilim (0–1), işlev (T tonik, S alt dominant, D dominant)
      const major = scale === 'major', V = [];
      const add = (id, r, q, t, fn, w) => V.push({ id, r, q, t, fn, w: w || 0 }); // w: nadirlik cezası (renkli akorlar daha seyrek)
      if (!major) {
        add('i', 0, scale === 'dorian' ? 'min_dor' : scale === 'phrygian' ? 'min_phr' : 'min_aeo', 0.05, 'T');
        add('bIII', 3, 'maj_ion', 0.2, 'T'); add('bVI', 8, 'maj_lyd', 0.3, 'S'); add('iv', 5, 'min_dor', 0.4, 'S'); add('bVII', 10, 'dom_mix', 0.38, 'S');
        add('v', 7, 'min_aeo', 0.5, 'D'); add('V7', 7, 'dom_b9', 0.85, 'D'); add('iiø', 2, 'hdim', 0.55, 'S', -0.2);
        add('bII', 1, 'maj_lyd', scale === 'phrygian' ? 0.35 : 0.6, 'S', scale === 'phrygian' ? 0 : -0.3); add('vii°', 11, 'dim7', 0.8, 'D', -0.7);
        if (scale === 'dorian') add('IV7', 5, 'dom_mix', 0.4, 'S');
        if (flavor === 'jazzy') { add('bII7', 1, 'dom_lyd', 0.78, 'D', -0.35); add('I7', 0, 'dom_mix', 0.55, 'D', -0.3); }
      } else {
        add('I', 0, 'maj_ion', 0.05, 'T'); add('vi', 9, 'min_aeo', 0.25, 'T'); add('iii', 4, 'min_phr', 0.3, 'T'); add('IV', 5, 'maj_lyd', 0.3, 'S'); add('ii', 2, 'min_dor', 0.35, 'S');
        add('V', 7, 'dom_mix', 0.7, 'D'); add('viiø', 11, 'hdim', 0.75, 'D', -0.5); add('iv', 5, 'min_dor', 0.5, 'S'); add('bVII', 10, 'dom_mix', 0.45, 'S'); add('bVI', 8, 'maj_lyd', 0.5, 'S');
        add('III7', 4, 'dom_b9', 0.8, 'D', -0.4); if (flavor === 'jazzy') add('bII7', 1, 'dom_lyd', 0.75, 'D', -0.35);
      }
      return V;
    }
    function v2Trans(a, b) { // iki akor arası geçiş gücü
      let s = 0; const mv = ((b.r - a.r) % 12 + 12) % 12;
      if (mv === 5) s += 1.0; else if (mv === 9) s += 0.5; else if (mv === 2 || mv === 10) s += 0.3; else if (mv === 3) s += 0.2;
      if (a.id === b.id) s -= 1.6;
      if (a.fn === 'D' && b.fn === 'T') s += 1.2; else if (a.fn === 'D' && b.fn === 'S') s -= 0.9; else if (a.fn === 'T' && b.fn === 'D') s += 0.1;
      if (a.q === 'dom_lyd' && mv === 11) s += 1.1; // tritone ikamesi yarım ton aşağı çözülür
      const ta = v2Tones(a), tb = v2Tones(b); s += 0.22 * ta.filter(x => tb.includes(x)).length;
      return s;
    }
    function v2Cadence(role, prev, c) {
      switch (role) {
        case 'half': return c.fn === 'D' ? 1.6 : (c.fn === 'S' ? 0.3 : -0.4);
        case 'full': return (c.fn === 'T' ? 1.2 : -1) + ((prev && prev.fn === 'D' && c.fn === 'T') ? 1.2 : 0);
        case 'tonic': return (c.id === 'i' || c.id === 'I') ? 2.2 : -1.5;
        case 'loop': return (c.fn === 'D' || c.fn === 'S') ? 0.8 : -0.2;
        case 'open': return c.fn === 'T' ? -0.5 : 0.5;
        default: return 0;
      }
    }
    function v2Harmonize(vocab, targets, role, rng, anchor) { // ışın araması: hedef gerilime en uygun, geçişleri güçlü, kadansla biten dizi
      const n = targets.length, W = 40; let beams = [{ seq: [], sc: 0 }];
      for (let i = 0; i < n; i++) {
        const nx = [];
        for (const b of beams) for (let ci = 0; ci < vocab.length; ci++) {
          const c = vocab[ci]; if (anchor && i < anchor.length && c.id !== anchor[i]) continue;
          const prev = i ? vocab[b.seq[i - 1]] : null; let sc = b.sc - 3.2 * Math.abs(c.t - targets[i]) + c.w;
          if (prev) sc += v2Trans(prev, c); else sc += (c.fn === 'T' ? 0.9 : (role === 'half' && c.fn === 'S' ? 0.3 : 0));
          for (const si of b.seq) if (si === ci) sc -= 0.45;
          if (i === n - 1) sc += v2Cadence(role, prev, c);
          sc += (rng() - 0.5) * 0.9; nx.push({ seq: b.seq.concat(ci), sc });
        }
        if (!nx.length) return null;
        nx.sort((a, b) => b.sc - a.sc); beams = nx.slice(0, W);
      }
      const top = beams.slice(0, 10), mx = top[0].sc, w = top.map(t => Math.exp((t.sc - mx) * 0.7)), tot = w.reduce((a, b) => a + b, 0); let r = rng() * tot, k = 0;
      while (k < top.length - 1 && r > w[k]) { r -= w[k]; k++; }
      return top[k].seq.map(i => vocab[i]);
    }
    // Enerji (melodi aralığı, yoğunluk, dinamik) ile armonik gerilim (akor seçimi) ayrıdır: drop'ta enerji yüksek ama armoni oturaklı, buildup'ta ikisi de yükselir.
    function v2Tension(p, rng) {
      const E = { intro: [0.10, 0.15, 0.20, 0.28], verse: [0.30, 0.38, 0.44, 0.55], buildup: [0.50, 0.62, 0.74, 0.88], drop: [0.72, 0.82, 0.86, 0.70], break: [0.36, 0.30, 0.32, 0.42], outro: [0.26, 0.20, 0.14, 0.06], ambient: [0.20, 0.28, 0.30, 0.22] };
      const H = { intro: [0.08, 0.14, 0.20, 0.25], verse: [0.25, 0.35, 0.40, 0.50], buildup: [0.45, 0.60, 0.75, 0.90], drop: [0.30, 0.45, 0.38, 0.32], break: [0.30, 0.40, 0.30, 0.45], outro: [0.30, 0.22, 0.15, 0.05], ambient: [0.20, 0.30, 0.30, 0.25] };
      const nb = songBars(p), j = () => (rng() - 0.5) * 0.06;
      return { energy: Array.from({ length: nb }, (_, b) => v2clamp((p.mix && p.mix.e && p.mix.e[b] !== undefined ? p.mix.e[b] : (E[sectionTypeOfBar(p, b)] || E.verse)[b % 4]) + j(), 0, 1)), harm: Array.from({ length: nb }, (_, b) => v2clamp((H[sectionTypeOfBar(p, b)] || H.verse)[b % 4] + j(), 0, 1)) };
    }
    function v2BuildChords(p, tension, style, rng) { // bölüm bölüm armoni; aynı türün tekrarında ilk iki akor korunur, son kısım yeni (dönüş)
      const vocab = v2Vocab(p.scale || 'minor', style.flavor), nb = songBars(p), out = [], seen = {};
      for (let blk = 0; blk * 4 < nb; blk++) {
        const type = sectionTypeOfBar(p, blk * 4), n = Math.min(4, nb - blk * 4), targets = tension.slice(blk * 4, blk * 4 + n);
        const prevSeq = seen[type]; const role = prevSeq ? (type === 'verse' ? 'full' : { intro: 'open', buildup: 'half', drop: 'loop', break: 'open', outro: 'tonic', ambient: 'open' }[type] || 'half') : ({ intro: 'open', verse: 'half', buildup: 'half', drop: 'loop', break: 'open', outro: 'tonic', ambient: 'open' }[type] || 'half');
        const seq = v2Harmonize(vocab, targets, role, rng, prevSeq ? prevSeq.slice(0, 2).map(c => c.id) : null) || v2Harmonize(vocab, targets, role, rng, null);
        if (!prevSeq) seen[type] = seq; seq.forEach(c => out.push({ id: c.id, r: c.r > 6 ? c.r - 12 : c.r, q: c.q }));
      }
      return out;
    }

    // ---- melodi ----
    // ---- Hook motoru v1 ----
    // Araştırma (Jakubowski ve ark. 2016): akılda kalan melodiler hızlı, tanıdık bir genel şekle (yükselip düşen yay), ve ortalamadan farklı birkaç aralığa
    // (beklenmedik sıçrama, tekrar eden nota) sahip. Hook = tanıdık şekil + bir sürpriz. Aday üret → puanla → seç.
    // (Tam tekrar sonra değişim, ritmik imza ve drop öncesi nefes boşluğu şarkı yazarlığı pratiğidir; araştırmanın dışında, kulakla doğrulanır.)
    function v2Pearson(a, b) { const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n; let c = 0, va = 0, vb = 0; for (let i = 0; i < n; i++) { c += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; } return (va && vb) ? c / Math.sqrt(va * vb) : 0; }
    function v2RhyGen(rng, hook, style) { // üretilen ritim hücresi: 3–7 vuruş, 1–4 adımlık aralıklar, çoğunlukla 0'da başlar
      const n = hook ? 4 + Math.floor(rng() * 4) : 3 + Math.floor(rng() * 3), steps = style.dens < 0.8 ? [2, 3, 3, 4, 4, 5] : [1, 2, 2, 3, 3, 4], out = [];
      let pos = rng() < 0.6 ? 0 : (rng() < 0.5 ? 2 : 3);
      while (out.length < n && pos <= 14) { out.push(pos); pos += steps[Math.floor(rng() * steps.length)]; }
      return out.length >= 3 ? out : [0, 4, 8];
    }
    function v2MotifCand(rng, style, kind) {
      const hook = kind === 'hook', pool = hook ? (style.dens > 1 ? [...V2_RHY.mid, ...V2_RHY.dense] : V2_RHY.mid) : (style.dens < 0.8 ? V2_RHY.sparse : [...V2_RHY.sparse, ...V2_RHY.mid]);
      const rhy = rng() < 0.5 ? pool[Math.floor(rng() * pool.length)].slice() : v2RhyGen(rng, hook, style);
      if (rng() < style.sync) { const i = 1 + Math.floor(rng() * Math.max(1, rhy.length - 1)); if (rhy[i] !== undefined && rhy[i] % 2 === 0 && rhy[i] + 1 < 16 && rhy.indexOf(rhy[i] + 1) < 0) rhy[i] += 1; rhy.sort((a, b) => a - b); }
      const n = rhy.length, con = [0], peak = v2clamp(Math.round((0.35 + 0.4 * rng()) * (n - 1)), 1, Math.max(1, n - 2));
      for (let i = 1; i < n; i++) { const toward = i <= peak ? 1 : -1; let st = rng() < 0.72 ? toward : (rng() < 0.5 ? 0 : -toward); if (rng() < 0.22) st *= 2; con.push(v2clamp(con[i - 1] + st, -5, 7)); }
      if (hook && n >= 4 && rng() < 0.85) { // imza sıçraması: beşli/altılı, ardından adımla dönüş
        const at = 1 + Math.floor(rng() * Math.min(3, n - 2)), dir = rng() < 0.7 ? 1 : -1, L = 4 + (rng() < 0.3 ? 1 : 0);
        con[at] = v2clamp(con[at - 1] + dir * L, -6, 9);
        for (let i = at + 1; i < n; i++) { const back = Math.sign(con[i - 1] - con[0]); con[i] = con[i - 1] - (back && rng() < 0.85 ? back : 0); }
      }
      if (hook && n >= 4 && rng() < 0.7) { const at = 1 + Math.floor(rng() * (n - 2)); if (Math.abs(con[at] - con[at - 1]) < 4) con[at] = con[at - 1]; } // tekrar eden nota
      return { rhy, con };
    }
    function v2HookScore(m, kind) {
      const c = m.con, n = c.length; if (n < 3) return -9;
      const corr = v2Pearson(c, c.map((_, i) => Math.sin(Math.PI * i / (n - 1))));
      let leaps = 0, reps = 0, big = 0; for (let i = 1; i < n; i++) { const d = Math.abs(c[i] - c[i - 1]); if (d >= 4) leaps++; if (d === 0) reps++; if (d >= 7) big++; }
      const range = Math.max(...c) - Math.min(...c), offs = m.rhy.filter(s => s % 4 !== 0).length / n, iois = new Set(m.rhy.slice(1).map((s, i) => s - m.rhy[i])).size;
      if (kind === 'verse') return 1.5 * corr + (leaps <= 1 ? 0.5 : -1) + (reps <= 1 ? 0.3 : -0.3) + (range <= 5 ? 0.5 : -0.5) + (iois >= 2 ? 0.3 : 0);
      return 2 * corr + (leaps === 1 ? 1.5 : leaps === 2 ? 0.5 : leaps === 0 ? 0 : -1.2 * (leaps - 2)) + (reps >= 1 && reps <= 2 ? 1 : (reps === 0 ? 0 : -0.6)) + (range <= 7 ? 0.5 : -0.5 * (range - 7))
        + (offs >= 0.25 && offs <= 0.6 ? 1 : 0) + (iois >= 2 ? 0.5 : 0) + (n >= 4 && n <= 7 ? 0.5 : 0) + ([-1, 0, 1, 2].includes(c[n - 1]) ? 0.5 : 0) + (m.rhy[0] === 0 ? 0.4 : 0) - big * 1.5;
    }
    function v2Motif(rng, style, tension, kind) { // 60 aday → en iyi 10 içinden tohumlu seçim
      const cands = Array.from({ length: 60 }, () => { const m = v2MotifCand(rng, style, kind); return { m, sc: v2HookScore(m, kind) }; }).sort((a, b) => b.sc - a.sc);
      const top = cands.slice(0, 10), w = top.map(t => Math.exp((t.sc - top[0].sc) * 0.6)), tot = w.reduce((a, b) => a + b, 0); let r = rng() * tot, k = 0;
      while (k < top.length - 1 && r > w[k]) { r -= w[k]; k++; }
      return Object.assign({}, top[k].m, { score: +top[k].sc.toFixed(2) });
    }
    function v2Transform(m, op) {
      let rhy = m.rhy.slice(), con = m.con.slice();
      if (op.frag) { const k = Math.max(2, Math.ceil(rhy.length * op.frag)); rhy = rhy.slice(0, k); con = con.slice(0, k); }
      if (op.inv) con = con.map(x => -x);
      if (op.aug) { const rr = [], cc = []; rhy.forEach((s, i) => { const t = Math.min(15, s * 2); if (!rr.includes(t)) { rr.push(t); cc.push(con[i]); } }); rhy = rr; con = cc; }
      if (op.vary) { for (let i = Math.max(1, con.length - 2); i < con.length; i++) con[i] += op.vary; } // sonu değişen tekrar (A')
      if (op.seq) con = con.map(x => x + op.seq);
      return { rhy, con };
    }
    const v2Edge = I => I === 0 ? 0.9 : I <= 2 ? 0 : I <= 4 ? 0.35 : I <= 7 ? 1.2 : I <= 12 ? 2.6 : 5;
    function v2MelodyBar(c, onsets, targets, center, prevPitch, cadence, rng, lo, hi, free, wt) { // Viterbi: perde dizisi (free: imza sıçramasının geldiği nota, wt: hedef kontura bağlılık)
      const cand = []; for (let d = Math.max(-3, center - 6); d <= Math.min(16, center + 7); d++) cand.push(d);
      const n = onsets.length, best = [], back = [];
      for (let j = 0; j < n; j++) {
        best.push([]); back.push([]);
        const strong = onsets[j] % 8 === 0 ? 2 : (onsets[j] % 4 === 0 ? 1.2 : 0);
        for (let k = 0; k < cand.length; k++) {
          const d = cand[k], ct = [0, 2, 4, 6].includes(v2mod7(d)), p = v2Pitch(c, d); let node = (wt || 1.1) * Math.abs(d - targets[j]);
          node += strong ? (ct ? 0 : 1.6 * strong) : (ct ? -0.1 : 0.15);
          if (cadence && j === n - 1) node += ct ? ([0, 2, 4].includes(v2mod7(d)) ? -0.6 : 0.4) : 5;
          if (p < lo) node += 0.5 * (lo - p); if (p > hi) node += 0.5 * (p - hi);
          node += (rng() - 0.5) * 0.3;
          if (j === 0) { best[j][k] = node + (prevPitch == null ? 0 : v2Edge(Math.abs(p - prevPitch))); back[j][k] = -1; }
          else { let bv = 1e9, bi = 0; for (let k2 = 0; k2 < cand.length; k2++) { const I = Math.abs(p - v2Pitch(c, cand[k2])), v = best[j - 1][k2] + ((j === free && I >= 5) ? 0.4 : v2Edge(I)); if (v < bv) { bv = v; bi = k2; } } best[j][k] = bv + node; back[j][k] = bi; }
        }
      }
      let k = 0; for (let i = 1; i < cand.length; i++) if (best[n - 1][i] < best[n - 1][k]) k = i;
      const out = new Array(n); for (let j = n - 1; j >= 0; j--) { out[j] = cand[k]; k = back[j][k]; }
      return out;
    }
    function v2LeadPlan(type, H, V, rng, style, tension, visit) { // 4 barlık frazın bar planı: { m: motif, cad: kadans, quiet, hook }
      const T = (m, op) => v2Transform(m, op || {}), N = () => v2Motif(rng, style, tension, 'verse');
      switch (type) {
        case 'drop': return visit ? // 2. ve sonraki drop: hook yine tam, bar 3'te zirveye taşınır
          [{ m: T(H), hook: 1 }, { m: T(H), hook: 1 }, { m: T(H, { seq: 2, vary: 1 }), hook: 1 }, { m: T(H, { frag: 0.7 }), cad: true, hook: 1 }]
          : [{ m: T(H), hook: 1 }, { m: T(H), hook: 1 }, { m: T(H, { vary: 2 }), hook: 1 }, { m: T(H, { frag: 0.7 }), cad: true, hook: 1 }];
        case 'buildup': return [{ m: T(H, { frag: 0.5 }), hook: 1 }, { m: T(H, { frag: 0.6, seq: 1 }), hook: 1 }, { m: T(H, { seq: 2 }) },
          { m: { rhy: [0, 2, 4, 6, 8, 10, 12], con: [0, 1, 1, 2, 3, 3, 4] } }]; // son barda son vuruş sessizlik: drop'a nefes (ters zil 12. adımda girer)
        case 'intro': return [{ m: T(V, { aug: 1 }), quiet: 1 }, { m: T(V, { aug: 1, seq: 1 }), quiet: 1 }, { m: T(H, { frag: 0.5 }), quiet: 1, hook: 1 }, { m: T(H, { frag: 0.5, vary: 1 }), cad: true, quiet: 1, hook: 1 }]; // hook'un ipucu
        case 'break': case 'ambient': return [{ m: { rhy: [0], con: [0] }, quiet: 1 }, { m: T(V, { aug: 1, frag: 0.5 }), quiet: 1 }, { m: { rhy: [0], con: [1] }, quiet: 1 }, { m: T(V, { aug: 1, frag: 0.5 }), cad: true, quiet: 1 }];
        case 'outro': return [{ m: T(H, { aug: 1 }), quiet: 1, hook: 1 }, { m: T(H, { aug: 1, seq: -1 }), quiet: 1, hook: 1 }, { m: T(V, { aug: 1 }), quiet: 1 }, { m: { rhy: [0], con: [0] }, cad: true, quiet: 1 }];
        default: return [{ m: T(V) }, { m: T(V, { seq: 1 }) }, { m: T(V, { inv: 1 }) }, { m: T(V, { frag: 0.7 }), cad: true }];
      }
    }

    // ---- Pad ses geçişi ----
    function v2Voicing(c, prev, ext) {
      const tones = [0, 2, 4, 6, 8].slice(0, ext === '9th' ? 5 : (ext === '7th' ? 4 : 3)); let best = null;
      const rec = (i, deg) => {
        if (i === tones.length) {
          const ps = deg.map(d => v2Pitch(c, d)).sort((a, b) => a - b), spread = ps[ps.length - 1] - ps[0], mean = ps.reduce((a, b) => a + b, 0) / ps.length;
          let cost = (spread > 17 ? 3 : 0) + Math.abs(mean - 7) * 0.12; if (prev && prev.length === ps.length) cost += ps.reduce((a, p, k) => a + Math.abs(p - prev[k]), 0) * 0.35;
          if (!best || cost < best.cost) best = { cost, deg: deg.slice(), ps }; return;
        }
        for (const k of [-7, 0]) rec(i + 1, deg.concat(tones[i] + k));
      };
      rec(0, []); return best;
    }

    // ---- ana işlev ----
    function composeV2(p, opts = {}) {
      const song = songOf(p), nb = songBars(p), style = V2_STYLE[p.genre] || V2_STYLE.synthwave, ext = p.chordExtension || '7th';
      const prev = p.v2, v = (prev && prev.var) ? Object.assign({ H: 0, Lead: 0, Bass: 0, Arp: 0, Keys: 0, Pad: 0, Drums: 0 }, prev.var) : { H: 0, Lead: 0, Bass: 0, Arp: 0, Keys: 0, Pad: 0, Drums: 0 };
      if (opts.bump) v[opts.bump] = (v[opts.bump] || 0) + 1;
      const tn = v2Tension(p, mulberry32(p.seed * 31 + 5)), tension = tn.energy;
      let chords = (!opts.reharm && prev && prev.chords && prev.chords.length === nb) ? prev.chords : null;
      if (!chords) chords = v2BuildChords(p, tn.harm, style, mulberry32(p.seed * 977 + 13 + v.H * 7919));
      if (opts.reharm && opts.bars && prev && prev.chords && prev.chords.length === nb) { // kapsamlı yeniden armonileme: yalnız kapsamdaki (ve elle düzenlenmemiş) barların akoru değişir
        const handEdited = b => V2_CHANNELS.some(ch => song.dirty[ch][b] === true);
        chords = chords.map((c, b) => (opts.bars.includes(b) && !handEdited(b)) ? c : prev.chords[b]);
      }
      p.engine = 2; p.v2 = { ver: 1, style: p.genre, chords, tension, harm: tn.harm, var: v };
      const cpx = (p.complexity == null ? 50 : p.complexity) / 100, dens = style.dens * (0.7 + 0.6 * cpx);
      const want = ch => !opts.chs || opts.chs.includes(ch), barOk = (ch, b) => (!opts.bars || opts.bars.includes(b)) && (opts.force || song.dirty[ch][b] !== true);
      const mark = (ch, b) => { if (song.dirty[ch][b] !== true) song.dirty[ch][b] = 2; };
      const clear = (ch, b) => { for (let s = 0; s < 16; s++) { const g = b * 16 + s; song.data[ch][g] = null; setCellOv(song, 'len', ch, g, undefined); setCellOv(song, 'vel', ch, g, undefined); setCellOv(song, 'acc', ch, g, undefined); } };
      const put = (ch, g, d, len, vel) => { song.data[ch][g] = d; setCellOv(song, 'len', ch, g, len); setCellOv(song, 'vel', ch, g, vel); setCellOv(song, 'acc', ch, g, undefined); };
      const cellsOf = (ch, b) => { const o = []; for (let s = 0; s < 16; s++) if (isActiveCell(song.data[ch][b * 16 + s])) o.push(s); return o; };
      const chordAt = b => chords[b % chords.length];

      // Lead + SubLead
      if (want('Lead') || want('SubLead')) {
        const rngL = mulberry32(p.seed * 53 + 17 + v.Lead * 104729), H = v2Motif(rngL, style, 0.8, 'hook'), V = v2Motif(rngL, style, 0.4, 'verse');
        let prevPitch = null; const visits = {}; p.v2.hook = { rhy: H.rhy, con: H.con, score: H.score };
        for (let blk = 0; blk * 4 < nb; blk++) {
          const type = sectionTypeOfBar(p, blk * 4), plan = v2LeadPlan(type, H, V, rngL, style, tension[blk * 4], visits[type] || 0); visits[type] = (visits[type] || 0) + 1;
          for (let k = 0; k < 4 && blk * 4 + k < nb; k++) {
            const b = blk * 4 + k, bp = plan[k], c = chordAt(b), t = tension[b], okL = want('Lead') && barOk('Lead', b), okS = want('SubLead') && barOk('SubLead', b);
            const center = 7 + Math.round((t - 0.5) * 5) + (style.hookHigh && (type === 'drop') ? 1 : 0);
            let m = bp.m; const keep = Math.max(2, Math.round(m.rhy.length * v2clamp(0.55 + dens * 0.45, 0.5, 1.2)));
            if (m.rhy.length > keep && type !== 'buildup') m = { rhy: m.rhy.slice(0, keep), con: m.con.slice(0, keep) };
            const anchor = [0, 2, 4, 6, 7, 9, 11, 13].reduce((a, d) => Math.abs(d - center) < Math.abs(a - center) ? d : a, 7), targets = m.con.map(x => anchor + x);
            let free = -1; for (let j = 1; j < m.con.length; j++) if (Math.abs(m.con[j] - m.con[j - 1]) >= 4) { free = j; break; }
            const degs = v2MelodyBar(c, m.rhy, targets, center, prevPitch, !!bp.cad, rngL, -2, 21, bp.hook ? free : -1, bp.hook ? 1.6 : 1.1);
            if (okL) { clear('Lead', b); mark('Lead', b); }
            if (okS) { clear('SubLead', b); mark('SubLead', b); }
            let peak = 0; degs.forEach((d, j) => { if (v2Pitch(c, d) > v2Pitch(c, degs[peak])) peak = j; });
            degs.forEach((d, j) => {
              const s = m.rhy[j], gap = (m.rhy[j + 1] !== undefined ? m.rhy[j + 1] : 16) - s, last = j === degs.length - 1;
              let len = Math.max(1, Math.min(8, Math.round(gap * style.leg))); if (bp.cad && last) len = Math.max(2, Math.min(12, 16 - s)); if (bp.quiet) len = Math.max(len, Math.min(16 - s, Math.round(gap * 0.95)));
              let vel = (s === 0 ? 88 : s % 8 === 0 ? 80 : s % 4 === 0 ? 74 : 66) + (j === peak ? 8 : 0) + (bp.hook && j === free ? 8 : 0) - (bp.quiet ? 14 : 0); vel = v2clamp(Math.round(vel * (0.85 + 0.3 * t)), 25, 100);
              if (okL) put('Lead', b * 16 + s, d, len, vel);
              if (okS && (s % 8 === 0 || (bp.cad && last)) && (type === 'drop' || type === 'buildup' || bp.quiet)) {
                const sd = [d - 2, d - 3, d - 4].find(x => [0, 2, 4, 6].includes(v2mod7(x))); put('SubLead', b * 16 + s, sd, Math.max(len, 4), Math.round(vel * 0.78));
              }
            });
            if (okL) prevPitch = v2Pitch(c, degs[degs.length - 1]);
          }
        }
      }
      // Davullar (ritim motoru v1)
      if (V2_DRUMS.some(want)) {
        const rngD = mulberry32(p.seed * 113 + 59 + (v.Drums || 0) * 86028121), G = V2_GROOVE[p.genre] || V2_GROOVE.synthwave, grooves = {};
        for (let b = 0; b < nb; b++) {
          const type = sectionTypeOfBar(p, b), k = b % 4, e = tension[b] * (0.7 + 0.6 * cpx), lastBar = b === nb - 1;
          const g = grooves[type] || (grooves[type] = { ki: Math.floor(rngD() * G.kick.length), si: Math.floor(rngD() * Math.max(1, G.snare.length)) });
          const rf = rngD(), rg = rngD(), rp = rngD(), rfi = Math.floor(rngD() * V2_FILLS.length);
          let kick = [], snare = [], hat = [], kv = {}, sv = {}, hv = {};
          const base = G.kick[g.ki], bs = G.snare.length ? G.snare[g.si] : [];
          if (type === 'intro') { hat = e < 0.2 ? [0, 8] : [0, 4, 8, 12]; hat.forEach(s => { hv[s] = 38 + (s % 8 === 0 ? 8 : 0); }); if (k >= 2 && e > 0.12) { kick = [0]; kv[0] = 78; } }
          else if (type === 'outro') { hat = k === 0 ? [0, 2, 4, 6, 8, 10, 12, 14] : (k === 1 ? [0, 4, 8, 12] : (k === 2 ? [0, 8] : [])); kick = k < 3 ? [0, 8].slice(0, k === 2 ? 1 : 2) : (lastBar ? [0] : []); if (k < 2) snare = bs.slice(); hat.forEach(s => { hv[s] = 52 - 6 * k; }); kick.forEach(s => { kv[s] = 80; }); snare.forEach(s => { sv[s] = 80; }); }
          else if (type === 'break' || type === 'ambient') { kick = k === 0 ? [0] : []; kv[0] = 70; hat = [0, 4, 8, 12]; hat.forEach(s => { hv[s] = 36; }); if (type === 'break' && k === 3) { snare = [12]; sv[12] = 60; } }
          else if (type === 'buildup') { // kademeli yükseliş; son barda snare roll'ü, son vuruş sessiz (nefes; ters zil 12. adımda girer)
            kick = k < 2 ? base.slice() : [0, 4, 8, 12]; kick.forEach(s => { kv[s] = 82 + k * 4; });
            if (k === 0) { snare = bs.slice(); } else if (k === 1) { snare = [4, 8, 10, 12, 14]; } else if (k === 2) { snare = [0, 2, 4, 6, 8, 10, 12, 14]; } else { snare = [0, 2, 4, 6, 8, 9, 10, 11, 12]; kick = [0, 4, 8, 12].filter(s => s < 12); }
            snare.forEach((s, i) => { sv[s] = k >= 2 ? Math.min(100, 45 + Math.round(i * (55 / Math.max(1, snare.length - 1)))) : 92; });
            hat = k === 3 ? [0, 4, 8] : [0, 2, 4, 6, 8, 10, 12, 14]; hat.forEach(s => { hv[s] = 55 + k * 5; });
          } else { // verse / drop / diğer: ana groove
            kick = base.slice(); snare = bs.slice(); kick.forEach(s => { kv[s] = s === 0 ? 100 : (s % 8 === 0 ? 92 : 84); }); snare.forEach(s => { sv[s] = 96; });
            const dropish = type === 'drop' || e > 0.6, mode = G.hat;
            if (mode === 'quarter') hat = [0, 4, 8, 12]; else if (mode === 'light') hat = [0, 2, 4, 6, 8, 10, 12, 14].filter(s => s % 4 === 0 || rf > 0.35 || s !== 6);
            else if (mode === 'gaps' || (dropish && mode !== 'eighth' && e > 0.7)) hat = Array.from({ length: 16 }, (_, s) => s).filter(s => s % 2 === 0 || rf > 0.3 + (s % 4 === 3 ? 0.25 : 0));
            else hat = [0, 2, 4, 6, 8, 10, 12, 14];
            hat.forEach(s => { hv[s] = s % 4 === 0 ? 82 : (s % 2 === 0 ? 64 : 44); });
            if (dropish && type === 'drop' && k === 0) { kick = Array.from(new Set(kick.concat([0]))); }
            if (k === 1 && rp < 0.4 && !kick.includes(14)) { kick.push(14); kv[14] = 68; } // 2. barda kick önceleyişi
            if (G.ghost && rg < G.ghost) { [3, 7, 11, 15].filter(s => !snare.includes(s) && rngD() < 0.5).forEach(s => { snare.push(s); sv[s] = 30 + Math.floor(rngD() * 12); }); }
            if (k === 3 && rf < G.fill * (0.45 + e) && type !== 'intro') { // faz sonu fill'i
              const F = V2_FILLS[rfi]; hat = hat.filter(s => s < 8); snare = snare.filter(s => s < 8).concat(F.sn); kick = kick.filter(s => s < 8).concat(F.ki);
              F.sn.forEach((s, i) => { sv[s] = Math.min(100, 55 + i * 10); }); F.ki.forEach(s => { kv[s] = 88; });
            }
          }
          const wr = (ch, arr, vm) => { if (!want(ch) || !barOk(ch, b)) return; clear(ch, b); Array.from(new Set(arr)).sort((a, b2) => a - b2).forEach(s => { if (s >= 0 && s < 16) put(ch, b * 16 + s, true, undefined, vm[s] === undefined ? 80 : vm[s]); }); mark(ch, b); };
          wr('Kick', kick, kv); wr('Snare', snare, sv); wr('HiHat', hat, hv);
        }
      }
      // Bas + SubBas
      if (want('Bass') || want('SubBass')) {
        const rngB = mulberry32(p.seed * 71 + 29 + v.Bass * 15485863);
        for (let b = 0; b < nb; b++) {
          const c = chordAt(b), nxt = chordAt(b + 1), t = tension[b];
          if (want('Bass') && barOk('Bass', b)) {
            let pos = cellsOf('Bass', b); const kk = cellsOf('Kick', b); // bas kick'e kilitlenir: kick vuruşları + ara sıra 16'lık önceleyiş
            if (kk.length && pos.length) { const sel = kk.filter(s => s % 4 === 0 || rngB() < 0.6); const extra = (b % 4 === 3 || t > 0.6) && rngB() < style.bassMove ? [kk.includes(14) ? 15 : 14] : []; pos = Array.from(new Set((sel.length ? sel : [0]).concat(extra))).sort((a, b2) => a - b2).slice(0, 7); clear('Bass', b); }
            pos.forEach((s, j) => {
              let d = 0; const last = j === pos.length - 1;
              if (j > 0) { const r = rngB(); d = r < 0.55 ? 0 : r < 0.77 ? 4 : r < 0.9 ? 7 : 2; }
              if (last && pos.length > 1 && (b + 1) % 4 !== 0 && rngB() < style.bassMove && nxt.id !== c.id) { // yaklaşma notası
                const target = v2Pitch(nxt, 0) + (rngB() < 0.5 ? -1 : 1) + (nxt.r - c.r > 6 ? -12 : (nxt.r - c.r < -6 ? 12 : 0)); let bd = 99;
                for (let x = -4; x <= 7; x++) { const dd = Math.abs(v2Pitch(c, x) - target); if (dd < bd && v2Pitch(c, x) !== v2Pitch(c, 0)) { bd = dd; d = x; } }
              }
              put('Bass', b * 16 + s, d, undefined, undefined); setCellOv(song, 'len', 'Bass', b * 16 + s, undefined);
            }); mark('Bass', b);
          }
          if (want('SubBass') && barOk('SubBass', b)) { let sp = cellsOf('SubBass', b); const kk = cellsOf('Kick', b).filter(s => s % 8 === 0); if (sp.length && kk.length) { clear('SubBass', b); sp = kk; } sp.forEach(s => put('SubBass', b * 16 + s, 0, undefined, undefined)); mark('SubBass', b); }
        }
      }
      // Pad (ses geçişli)
      if (want('Pad')) {
        let prevPs = null;
        for (let b = 0; b < nb; b++) {
          const c = chordAt(b), vo = v2Voicing(c, prevPs, ext); prevPs = vo.ps;
          if (barOk('Pad', b)) { cellsOf('Pad', b).forEach(s => put('Pad', b * 16 + s, vo.deg.slice(), undefined, undefined)); mark('Pad', b); }
        }
      }
      // Arp + Keys
      if (want('Arp') || want('Keys')) {
        const rngA = mulberry32(p.seed * 97 + 41 + v.Arp * 32452843), rngK = mulberry32(p.seed * 89 + 43 + v.Keys * 49979687);
        const tri = ext === 'triad' ? [0, 2, 4, 7] : [0, 2, 4, 6, 7], pats = [[0, 1, 2, 3], [0, 1, 2, 3, 2, 1], [0, 2, 1, 3], [3, 2, 1, 0]];
        let ap = pats[Math.floor(rngA() * pats.length)];
        for (let b = 0; b < nb; b++) {
          const t = tension[b], hi = t > 0.6 ? 7 : 0;
          if (want('Arp') && barOk('Arp', b)) { if (b % 4 === 0) ap = pats[Math.floor(rngA() * pats.length)]; cellsOf('Arp', b).forEach((s, j) => { put('Arp', b * 16 + s, tri[ap[j % ap.length] % tri.length] + (j % 8 >= 4 ? hi : 0), undefined, undefined); }); mark('Arp', b); }
          if (want('Keys') && barOk('Keys', b)) { const kt = [2, 4, 6, 7, 9]; cellsOf('Keys', b).forEach((s, j) => { put('Keys', b * 16 + s, kt[(j + Math.floor(rngK() * 2)) % kt.length], undefined, undefined); }); mark('Keys', b); }
        }
      }
      song.editCount = (song.editCount || 0) + 1;
      return p;
    }
    // R düğmesi (v2): kanal grubunu yeniden besteler (kapsamdaki barlar, kilitsiz; elle düzenlenen barlar korunur)
    function v2Refresh(p, ch, bars) { const g = V2_GROUP[ch]; if (!g) return false; const chs = V2_ALL.filter(c => V2_GROUP[c] === g); composeV2(p, { chs, bars, bump: g }); return true; }
    function v2Reharmonize(p, bars) { composeV2(p, { reharm: true, bump: 'H', bars, chs: V2_CHANNELS.filter(c => !(typeof mixerState !== 'undefined' && mixerState[c] && mixerState[c].locked)) }); }
