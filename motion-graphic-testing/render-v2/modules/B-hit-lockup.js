// Module: B-hit-lockup.js. Function declarations here override the defaults in base.js. Keep the signatures. No top-level const/let unless prefixed with the module id (e.g. const B_FLOOR = ...).
// Frames 4 (the hit), 9 (the lockup) and 10 (the line), plus lockupGeom / drawLockup / drawTagline.

// Mark geometry extracted from assets/lockup-dark.png (units: fraction of the lockup image width, origin at the mark centre).
const B_MARK = {
  cx: 0.50456, cy: 0.26296, R: 0.25758, split: 0.557, oneInch: [0.557, 0.735], media: [0.735, 0.84],
  slash: { x: 0.03692, y: 0.03164, ang: -0.72267, half: 0.3375, w: 0.0052, cut: 0.0265 },
  one: [.0172,-.1319,.0329,-.1319,.0337,.0210,.0322,.0538,.0329,.1010,.0344,.1110,.0379,.1174,.0422,.1210,.0629,.1245,.0629,.1345,-.0471,.1345,-.0471,.1245,-.0456,.1231,-.0406,.1238,-.0335,.1224,-.0242,.1181,-.0192,.1131,-.0163,.1038,-.0178,.0974,-.0156,.0638,-.0163,-.0719,-.0192,-.0819,-.0263,-.0869,-.0321,-.0869,-.0542,-.0812,-.0542,-.0962,-.0442,-.0983,-.0242,-.1062,-.0021,-.1183],
  blades: [
    { a: -3.0625, pts: [-.1363,.1153,-.1613,.1017,-.1943,.0795,-.2127,.0650,-.2298,.0488,-.2327,.0473,-.2487,.0316,-.2558,.0224,-.2571,.0000,-.2558,-.0291,-.2529,-.0480,-.2472,-.0732,-.2357,-.1062,-.2312,-.1140,-.2286,-.1215,-.2165,-.1433,-.1989,-.1684,-.1979,-.1675,-.1941,-.1476,-.1814,-.0714,-.1800,-.0682,-.1734,-.0306,-.1720,-.0280,-.1722,-.0242,-.1712,-.0233,-.1671,-.0007,-.1648,.0058,-.1651,.0086,-.1634,.0121,-.1628,.0186,-.1598,.0274,-.1601,.0297,-.1555,.0446,-.1536,.0551,-.1527,.0556,-.1522,.0607,-.1505,.0631,-.1442,.0892,-.1427,.0909,-.1413,.0989,-.1357,.1149] },
    { a: -2.0579, pts: [-.1641,-.0722,-.1694,-.0929,-.1714,-.1071,-.1729,-.1101,-.1843,-.1843,-.1829,-.1877,-.1750,-.1961,-.1620,-.2074,-.1607,-.2075,-.1586,-.2105,-.1291,-.2306,-.0970,-.2462,-.0785,-.2527,-.0629,-.2570,-.0447,-.2604,-.0184,-.2632,.0103,-.2633,.0354,-.2604,.0365,-.2599,.0350,-.2576,.0052,-.2363,-.0000,-.2310,-.0030,-.2289,-.0040,-.2292,-.0657,-.1756,-.1136,-.1284,-.1170,-.1233,-.1243,-.1169,-.1292,-.1104,-.1351,-.1055,-.1363,-.1027,-.1421,-.0977,-.1456,-.0918,-.1558,-.0820,-.1555,-.0809,-.1634,-.0719] },
    { a: -1.1036, pts: [-.0328,-.1813,.0187,-.2249,.0207,-.2254,.0331,-.2355,.0598,-.2541,.0635,-.2547,.0887,-.2470,.0958,-.2432,.0971,-.2434,.1177,-.2334,.1408,-.2189,.1421,-.2168,.1435,-.2168,.1544,-.2087,.1690,-.1961,.1836,-.1820,.1836,-.1804,.1923,-.1717,.2128,-.1449,.2116,-.1161,.2058,-.1212,.2059,-.1225,.1980,-.1311,.1954,-.1305,.1875,-.1325,.1570,-.1426,.0858,-.1598,.0651,-.1632,.0646,-.1641,.0591,-.1647,.0586,-.1656,.0546,-.1655,.0441,-.1675,.0435,-.1683,.0270,-.1703,.0234,-.1719,.0106,-.1732,.0053,-.1749,.0015,-.1746,-.0039,-.1763,-.0325,-.1799] },
    { a: -0.0559, pts: [.1287,-.1333,.1291,-.1325,.1366,-.1320,.1548,-.1276,.1807,-.1196,.1859,-.1162,.1888,-.1157,.1890,-.1147,.2131,-.1039,.2351,-.0891,.2407,-.0841,.2438,-.0804,.2435,-.0791,.2480,-.0676,.2559,-.0314,.2581,-.0068,.2581,.0147,.2559,.0417,.2501,.0694,.2387,.1038,.2228,.1352,.2135,.1495,.2107,.1448,.2087,.1330,.2065,.1278,.2001,.1020,.1878,.0610,.1874,.0564,.1764,.0224,.1759,.0177,.1692,-.0015,.1688,-.0066,.1606,-.0305,.1574,-.0444,.1529,-.0549,.1537,-.0559,.1507,-.0687,.1508,-.0744,.1495,-.0762,.1487,-.0867,.1473,-.0876,.1452,-.0943,.1329,-.1197,.1329,-.1218,.1280,-.1325] },
    { a: 0.9641, pts: [.1692,.0534,.1781,.0793,.1987,.1580,.1987,.1682,.1937,.1760,.1694,.2000,.1671,.2010,.1652,.2040,.1552,.2117,.1286,.2296,.1051,.2417,.0803,.2510,.0525,.2582,.0230,.2625,.0011,.2625,.0492,.2133,.0565,.2037,.0707,.1890,.0710,.1873,.0923,.1631,.0951,.1582,.1072,.1436,.1072,.1423,.1188,.1285,.1195,.1259,.1238,.1216,.1293,.1124,.1309,.1118,.1444,.0902,.1478,.0853,.1495,.0846,.1507,.0809,.1523,.0801,.1544,.0753,.1686,.0532] },
    { a: 2.0705, pts: [.0589,.1761,.0579,.1783,.0544,.1809,.0527,.1840,.0193,.2209,-.0043,.2446,-.0228,.2604,-.0263,.2611,-.0399,.2594,-.0690,.2532,-.0939,.2447,-.1020,.2403,-.1085,.2382,-.1305,.2261,-.1498,.2120,-.1521,.2037,-.1606,.1864,-.1594,.1817,-.1732,.1924,-.1815,.1847,-.1823,.1823,-.1934,.1711,-.2049,.1558,-.2186,.1353,-.2328,.1073,-.2421,.0822,-.2464,.0683,-.2483,.0562,-.2493,.0553,-.2485,.0539,-.2248,.0752,-.1841,.1052,-.1427,.1296,-.1213,.1396,-.1192,.1396,-.1028,.1482,-.1019,.1496,-.0985,.1502,-.0927,.1542,-.0915,.1537,-.0913,.1550,-.0850,.1582,-.0814,.1581,-.0717,.1611,-.0661,.1616,-.0657,.1625,-.0564,.1637,-.0559,.1646,-.0231,.1695,-.0187,.1711,.0008,.1732,.0083,.1730,.0091,.1740,.0129,.1738,.0145,.1747,.0183,.1740,.0270,.1754,.0587,.1754] },
  ],
};
// Registration against the artwork, measured by poke-counting (procedural ink outside the lockup PNG's own ink is what shows through its alpha).
// The traced numeral already sits wholly inside the artwork's '1' (its 50% contour is ~0.8 px outside the trace), so it stays put.
const B_ONE_DY = 0, B_ONE_S = 1;
// The artwork's slash line drifts sub-pixel along its length, so no rectangle sits inside it; the landing reveals the artwork's own line through the
// knockout band instead (B_redLine). This width is only for the fallback when the image is not loaded.
const B_SLASH_W = 0.0032;

// ---------- shared helpers (module B) ----------
const B_RGB = { bone: '239,233,222', red: '231,39,34', steel: '140,147,155' };
function B_back(t, c) { t = clamp(t, 0, 1); const d = c + 1, u = t - 1; return 1 + u * u * (d * u + c); }
// soft ring: radial gradient band from rIn to rOut, brightest at peakT (0..1) across the band
function B_softRing(ctx, cx, cy, rIn, rOut, rgb, alpha, peakT) {
  if (alpha <= 0.003 || rOut <= rIn + 0.5) return;
  rIn = Math.max(0, rIn);
  const g = ctx.createRadialGradient(cx, cy, rIn, cx, cy, rOut);
  const pk = clamp(peakT == null ? 0.6 : peakT, 0.02, 0.98);
  g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(pk * 0.75, `rgba(${rgb},${alpha * 0.28})`); g.addColorStop(pk, `rgba(${rgb},${alpha})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(cx - rOut, cy - rOut, rOut * 2, rOut * 2); ctx.restore();
}
function B_glow(ctx, cx, cy, r, rgb, alpha, sx, sy) {
  if (alpha <= 0.003) return;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sx || 1, sy || 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, `rgba(${rgb},${alpha})`); g.addColorStop(0.12, `rgba(${rgb},${alpha * 0.62})`); g.addColorStop(0.35, `rgba(${rgb},${alpha * 0.22})`); g.addColorStop(0.65, `rgba(${rgb},${alpha * 0.05})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
}
function B_grain(ctx, W, H, amount, p, base) { if (amount > 0.001) PR.grain(ctx, W, H, amount, base * 1000 + Math.floor(p * 300)); }
function B_camShake(q) { // decaying hand-held jolt with a little roll; smooth in q, 3-7 frame periods at 30 fps
  const f = q * 28, env = Math.pow(Math.max(0, 1 - q), 2.6);
  return { x: env * (16 * Math.sin(f * 1.9) + 7 * Math.sin(f * 0.83 + 1.1)), y: env * (10 * Math.sin(f * 1.45 + 0.6) + 5 * Math.sin(f * 0.6 + 2.3)), rot: env * 0.016 * Math.sin(f * 1.1 + 0.3) };
}
function B_polyCentroid(pts) { // area centroid (shoelace)
  let A = 0, cx = 0, cy = 0; const n = pts.length / 2;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n, x0 = pts[2 * i], y0 = pts[2 * i + 1], x1 = pts[2 * j], y1 = pts[2 * j + 1], c = x0 * y1 - x1 * y0; A += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c; }
  A *= 0.5; return [cx / (6 * A), cy / (6 * A)];
}

// ---------- frame 4: the hit ----------
function fHit(ctx, p, W, H) {
  if (p < 0.07) { ctx.fillStyle = C.bone; ctx.fillRect(0, 0, W, H); return; }
  const q = win(p, 0.07, 1), cx = W / 2, cy = H / 2, dq = 1 / 28; // dq = one frame in q units
  const sk = B_camShake(q);
  ctx.save(); ctx.translate(cx + sk.x, cy + sk.y); ctx.rotate(sk.rot); ctx.scale(1.035, 1.035); ctx.translate(-cx, -cy);
  ctx.fillStyle = C.screen; ctx.fillRect(-80, -80, W + 160, H + 160);
  const core = Math.exp(-q * 7), haze = 0.07 + 0.3 * Math.exp(-q * 2.2);
  // lingering haze (this is what remains at p=1) with a broad warm/cool split under it
  B_glow(ctx, cx, cy, H * 0.75, B_RGB.red, haze * 0.5, 1.25, 1);
  B_glow(ctx, cx, cy, H * 0.55, B_RGB.bone, haze * 0.22, 1.1, 1);
  const ca = 4 + 22 * core;
  B_glow(ctx, cx - ca, cy - ca * 0.35, H * 0.34, B_RGB.steel, 0.26 * core, 1.15, 1);
  B_glow(ctx, cx + ca, cy + ca * 0.35, H * 0.34, B_RGB.red, 0.26 * core, 1.15, 1);
  // the hot core, chromatically split: a cool steel copy up-left (laid over the haze, since steel added to red only desaturates), a warm red copy
  // down-right (added), bone in the middle. The side copies are the small core's size, offset by more than its hot radius, so they show as crescents.
  if (core > 0.004) {
    const d = 12 + 22 * core, r1 = H * (0.1 + 0.16 * core), r2 = H * 0.05 * (0.5 + core), a1 = 0.9 * core, a2 = Math.min(1, 1.5 * core);
    B_glow(ctx, cx - d, cy - d * 0.35, r2 * 1.15, B_RGB.steel, Math.min(1, a2 * 1.1), 1.6, 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    B_glow(ctx, cx + d, cy + d * 0.35, r2 * 1.15, B_RGB.red, a2 * 0.8, 1.6, 1); B_glow(ctx, cx + d * 0.6, cy + d * 0.2, r1, B_RGB.red, a1 * 0.35, 1.3, 1);
    ctx.restore();
    B_glow(ctx, cx, cy, r1, B_RGB.bone, a1, 1.3, 1); B_glow(ctx, cx, cy, r2, B_RGB.bone, a2, 1.6, 1);
  }
  // shock rings: each drawn as a motion-smeared band between last frame's radius and this one's, thickness and alpha falling off.
  // The lead ring runs on a slower clock so the first dark frame catches it leaving the seam, and its trail is most of a frame's travel.
  const RMAX = W * 0.66, delays = [0, 0.075, 0.17];
  for (let i = 0; i < 3; i++) {
    const qi = win(q, delays[i], 1); if (qi <= 0) continue;
    const tm = i === 0 ? 0.75 : 1;
    const rNow = RMAX * ease.outExpo(qi * tm), rPrev = RMAX * ease.outExpo(Math.max(0, qi - dq) * tm), w = lerp(12, 3, qi) * (1 - i * 0.2);
    const a = Math.pow(1 - qi, 1.7) * (i === 0 ? 0.8 : 0.45), trail = Math.min(150, (rNow - rPrev) * 0.6);
    B_softRing(ctx, cx, cy, rNow - trail - w, rNow + w, B_RGB.red, a, 0.82);
    if (i === 0) {
      B_softRing(ctx, cx, cy, rNow - w * 0.6, rNow + w * 0.6, B_RGB.bone, a * 0.9 * Math.exp(-qi * 2.5), 0.5);
      const caA = 0.35 * a * (1 - win(qi, 0.2, 0.3)); // colour fringing on the lead edge while it is still sharp
      if (caA > 0.003) { B_softRing(ctx, cx, cy, rNow + 4 - w * 0.5, rNow + 4 + w * 0.5, B_RGB.steel, caA, 0.5); B_softRing(ctx, cx, cy, rNow - 4 - w * 0.5, rNow - 4 + w * 0.5, B_RGB.red, caA, 0.5); }
    }
  }
  // radial light streaks: bright near the source, tailing off outward
  const rs = PR.rng(51); ctx.save(); ctx.lineCap = 'round';
  const grow = ease.outExpo(q), sa = Math.pow(1 - q, 1.4);
  for (let i = 0; i < 52; i++) {
    const a = rs() * Math.PI * 2, r0 = H * 0.03 + rs() * H * 0.1, len = H * 0.2 + rs() * H * 0.95, al = (0.1 + rs() * 0.4) * sa, lw = 0.7 + rs() * 1.4;
    const ri = r0 + len * grow * 0.3, ro = r0 + len * grow, ca_ = Math.cos(a), sn = Math.sin(a);
    const x0 = cx + ca_ * ri, y0 = cy + sn * ri, x1 = cx + ca_ * ro, y1 = cy + sn * ro;
    const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, `rgba(${B_RGB.bone},${al})`); g.addColorStop(1, `rgba(${B_RGB.bone},0)`);
    ctx.strokeStyle = g; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.restore();
  // debris: sparks leaving the seam over the first five frames, drag + gravity, each drawn as a 0.7-frame motion streak and added so overlaps bloom
  const r = PR.rng(77), G = H * 1.9, shutter = dq * 0.7; ctx.save(); ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 170; i++) {
    const side = r() < 0.5 ? 1 : -1, omni = r() < 0.25;
    const a = omni ? r() * Math.PI * 2 : (side > 0 ? 0 : Math.PI) + (r() - 0.5) * 1.8;
    const v = (0.25 + r() * 0.75) * W * 1.4, k = 2.4 + r() * 1.8, life = 0.35 + r() * 0.6, size = 0.7 + r() * 2.1, isRed = r() < 0.3, born = r() * 0.18;
    const ey = cy + (r() + r() + r() - 1.5) / 1.5 * H * 0.12;
    const t = q - born; if (t <= 0 || t > life) continue;
    const pos = tt => { const s = v * (1 - Math.exp(-k * tt)) / k; return [cx + Math.cos(a) * s, ey + Math.sin(a) * s + 0.5 * G * tt * tt]; };
    const [x1, y1] = pos(t), [x0, y0] = pos(Math.max(0, t - shutter));
    const lf = t / life, al = Math.pow(1 - lf, 0.8) * (isRed ? 0.7 : 0.9) * Math.min(1, t / dq);
    ctx.strokeStyle = `rgba(${isRed ? B_RGB.red : B_RGB.bone},${al})`; ctx.lineWidth = size * (1 - 0.55 * lf);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.restore();
  // the seam of light where the blades met: bright bloom that settles into a thin steady line, with a cool/warm fringe while it is still hot
  const settle = 1 - Math.exp(-q * 4), bloomA = 0.5 * (1 - settle) + 0.07, bw = 14 + 60 * (1 - settle);
  B_glow(ctx, cx, cy, H * 0.72, B_RGB.bone, bloomA, bw / (H * 0.72), 1);
  const seamA = 0.4 + 0.6 * (1 - settle), seamCA = 0.3 * (1 - win(q, 0.15, 0.25));
  const seam = (x, w, rgb, al) => { const lg = ctx.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, `rgba(${rgb},${al * 0.25})`); lg.addColorStop(0.5, `rgba(${rgb},${al})`); lg.addColorStop(1, `rgba(${rgb},${al * 0.25})`); ctx.fillStyle = lg; ctx.fillRect(x, -80, w, H + 160); };
  if (seamCA > 0.003) { seam(cx - 3, 1, B_RGB.steel, seamCA); seam(cx + 2, 1, B_RGB.red, seamCA); }
  seam(cx - 1, 2, B_RGB.bone, seamA);
  ctx.restore();
  // exposure afterglow of the shutter frame: three frames of decay instead of a hard pop
  const after = 0.32 * Math.exp(-q * 50); if (after > 0.004) { ctx.save(); ctx.globalAlpha = after; ctx.fillStyle = C.bone; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  PR.vignette(ctx, W, H, 0.55); B_grain(ctx, W, H, 0.04, p, 4);
}

// ---------- lockup geometry and image helpers ----------
function lockupGeom(W, H) {
  const inch = W * 0.4, x0 = W / 2 - inch / 2; const imgW = inch, imgH = imgW * GEO.hw, imgX = x0, imgY = H * 0.07;
  return { inch, x0, x1: x0 + inch, imgW, imgH, imgX, imgY, ry: imgY + imgH + H * 0.07, markCy: imgY + GEO.markCy * imgW, cx: W / 2, cy: imgY + imgH / 2,
    mcx: imgX + B_MARK.cx * imgW, mcy: imgY + B_MARK.cy * imgW, mr: B_MARK.R * imgW };
}
function drawLockup(ctx, g, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  if (ready(LOGO)) ctx.drawImage(LOGO, g.imgX, g.imgY, g.imgW, g.imgH);
  else { PR.title(ctx, 'ONE INCH', g.cx, g.imgY + g.imgW * 0.6, g.imgW * 0.11, C.bone, { weight: 600, tracking: g.imgW * 0.045 }); PR.title(ctx, 'MEDIA', g.cx, g.imgY + g.imgW * 0.75, g.imgW * 0.07, C.red, { weight: 500, tracking: g.imgW * 0.045 }); }
  ctx.restore();
}
// a horizontal slice of the lockup image (rows y0..y1 in image-width units), optionally shifted vertically
function B_lockupSlice(ctx, g, alpha, y0, y1, dy) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.rect(g.imgX - 4, g.imgY + y0 * g.imgW + (dy || 0), g.imgW + 8, (y1 - y0) * g.imgW); ctx.clip();
  ctx.translate(0, dy || 0); drawLockup(ctx, g, 1); ctx.restore();
}
function drawTagline(ctx, g, reveal, alpha) {
  const x = g.imgX + GEO.tagLeft * g.imgW, y = g.imgY + GEO.tagTop * g.imgW, w = GEO.tagW * g.imgW, h = GEO.tagH * g.imgW;
  const a = alpha == null ? 1 : alpha; if (a <= 0 || reveal <= 0) return;
  const draw = () => { if (ready(TAG)) ctx.drawImage(TAG, x, y, w, h); else PR.title(ctx, 'SMALL DETAILS. BIG IMPACT.', g.cx, y + h / 2, h * 0.85, C.bone, { weight: 600 }); };
  ctx.save(); ctx.globalAlpha = a;
  if (reveal >= 1) { draw(); ctx.restore(); return; }
  const feather = 28, edge = x - 2 + (w + 4 + feather) * reveal;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 2, y - 2, Math.max(0, edge - (x - 2)), h + 4); ctx.clip(); draw(); ctx.restore();
  // soft leading edge: the screen is black here, so a screen-coloured ramp laid over the edge fades the letters out with no steps
  const fg = ctx.createLinearGradient(edge - feather, 0, edge, 0); fg.addColorStop(0, 'rgba(11,11,11,0)'); fg.addColorStop(1, 'rgba(11,11,11,1)');
  ctx.fillStyle = fg; ctx.fillRect(edge - feather, y - 2, feather + 1, h + 4);
  // glowing leading edge: a warm bloom with a hot bone core, fading as the wipe begins and ends
  const k = Math.pow(1 - reveal, 0.6) * Math.pow(Math.min(1, reveal * 4), 0.5), ex = edge - feather * 0.5;
  B_glow(ctx, ex, y + h / 2, h * 5, B_RGB.red, 0.2 * k, 0.32, 1);
  B_glow(ctx, ex, y + h / 2, h * 3.2, B_RGB.bone, 0.55 * k, 0.2, 1);
  const lg = ctx.createLinearGradient(0, y - h * 0.5, 0, y + h * 1.5); lg.addColorStop(0, `rgba(${B_RGB.bone},0)`); lg.addColorStop(0.5, `rgba(${B_RGB.bone},${0.4 * k})`); lg.addColorStop(1, `rgba(${B_RGB.bone},0)`);
  ctx.fillStyle = lg; ctx.fillRect(ex - 1, y - h * 0.5, 2, h * 2);
  ctx.restore();
}

// ---------- the procedural mark (blades, numeral, slash cut) ----------
const B_T0 = 24 / 90, B_SW0 = 0.05, B_SW1 = 0.41; // contact: frame 24 of the 90-frame lockup; the flight window
const B_SETT = B_SW1 - B_T0, B_SETW = 3 * Math.PI / B_SETT; // damped settle after contact: 1.5 cycles, over by p = SW1
// per-blade flight: spread (multiple of the mark radius), self-rotation in flight, and for the two upper blades an approach from the upper corners
// (dir, 30 degrees above horizontal) with a short travel, since a radial path from above leaves the frame; all six stay on screen from the first frame
const B_FLY = [{ sp: 1.75, rot: -0.5 }, { sp: 0.75, rot: -0.85, dir: -2.62 }, { sp: 0.75, rot: -0.9, dir: -0.52 }, { sp: 1.85, rot: -0.55 }, { sp: 1.65, rot: -0.45 }, { sp: 1.9, rot: -0.5 }];
const B_BC = B_MARK.blades.map(b => B_polyCentroid(b.pts)), B_ONE_C = B_polyCentroid(B_MARK.one);
function B_bladePath(ctx, pts, s, ox, oy) { ctx.beginPath(); for (let i = 0; i < pts.length; i += 2) { const x = ox + pts[i] * s, y = oy + pts[i + 1] * s; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); }
// blade motion at p: uu = flight displacement fraction (1 = fully spread, 0 = landed), settle = px of damped overshoot along the approach after contact
function B_motion(pp) {
  const uu = 1 - B_back(win(pp, B_SW0, B_SW1), 0.7), t = pp - B_T0;
  const settle = t > 0 ? -10 * Math.exp(-t * 14) * Math.sin(t * B_SETW) * (1 - win(t, 0.11, B_SETT)) : 0;
  return { uu, settle };
}
function B_travel(g, pp) { const m = B_motion(pp); return m.uu * g.mr * 1.9 + m.settle; } // px along the longest approach, for the blur sampling
function B_blades(ctx, g, m, alpha, shade) {
  const s = g.imgW, R = g.mr; if (alpha <= 0.003) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(g.mcx, g.mcy);
  for (let i = 0; i < B_MARK.blades.length; i++) {
    const b = B_MARK.blades[i], f = B_FLY[i], sp = f.sp * R, d = m.uu * sp + m.settle, rot = d / sp * f.rot, c = B_BC[i], ang = f.dir == null ? b.a : f.dir;
    ctx.save(); ctx.translate(Math.cos(ang) * d, Math.sin(ang) * d);
    ctx.translate(c[0] * s, c[1] * s); ctx.rotate(rot); ctx.translate(-c[0] * s, -c[1] * s);
    B_bladePath(ctx, b.pts, s, 0, 0); ctx.fillStyle = C.bone; ctx.fill();
    if (shade > 0.01) { // in-flight lighting: a cool fall-off across each blade that flattens out on landing
      const lg = ctx.createLinearGradient(Math.cos(b.a) * R * 0.6, Math.sin(b.a) * R * 0.6, 0, 0); lg.addColorStop(0, 'rgba(43,46,50,0)'); lg.addColorStop(1, `rgba(43,46,50,${0.45 * shade})`);
      ctx.fillStyle = lg; ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}
function B_one(ctx, g, alpha, scale) { // the numeral, registered to the artwork
  if (alpha <= 0.003) return;
  const s = g.imgW, c = B_ONE_C; ctx.save(); ctx.globalAlpha = alpha;
  ctx.translate(g.mcx + c[0] * s, g.mcy + (c[1] + B_ONE_DY) * s); ctx.scale(scale * B_ONE_S, scale * B_ONE_S); ctx.translate(-c[0] * s, -c[1] * s);
  B_bladePath(ctx, B_MARK.one, s, 0, 0); ctx.fillStyle = C.bone; ctx.fill(); ctx.restore();
}
function B_cutClip(ctx, g, cutLen) { // clip out the slash knockout band so the blades and numeral read as cut by the slash
  const s = g.imgW, S = B_MARK.slash, hw = S.cut * s * 0.5, cx = g.mcx + S.x * s, cy = g.mcy + S.y * s, ca = Math.cos(S.ang), sa = Math.sin(S.ang);
  const P = (u, v) => [cx + u * ca - v * sa, cy + u * sa + v * ca];
  ctx.beginPath(); ctx.rect(-200, -200, ctx.canvas.width + 400, ctx.canvas.height + 400);
  const c0 = P(-cutLen, -hw), c1 = P(cutLen, -hw), c2 = P(cutLen, hw), c3 = P(-cutLen, hw);
  ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c1[0], c1[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(c3[0], c3[1]); ctx.closePath();
  ctx.clip('evenodd');
}
function B_redLine(ctx, g, len, alpha) { // the slash line growing out from the centre: the artwork's own line, clipped to the knockout band, so it registers exactly
  const s = g.imgW, S = B_MARK.slash; if (alpha <= 0 || len <= 0) return;
  const cx = g.mcx + S.x * s, cy = g.mcy + S.y * s;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.rotate(S.ang);
  if (ready(LOGO)) { ctx.beginPath(); ctx.rect(-len, -S.cut * s * 0.5, len * 2, S.cut * s); ctx.clip(); ctx.rotate(-S.ang); ctx.translate(-cx, -cy); ctx.drawImage(LOGO, g.imgX, g.imgY, g.imgW, g.imgH); }
  else { ctx.fillStyle = C.red; ctx.fillRect(-len, -B_SLASH_W * s / 2, len * 2, B_SLASH_W * s); }
  ctx.restore();
}
function B_flash(ctx, g, flash, H) { // the slash flashing through the mark on landing: a soft band and a hot line, both fading out along their length so nothing leaves the mark
  if (flash <= 0 || flash >= 1) return;
  const S = B_MARK.slash, L = ease.out(flash) * g.imgW * 0.42, bw = H * 0.05, k = 1 - flash;
  ctx.save(); ctx.translate(g.mcx + S.x * g.imgW, g.mcy + S.y * g.imgW); ctx.rotate(S.ang);
  const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, L); rg.addColorStop(0, `rgba(${B_RGB.red},${0.3 * k})`); rg.addColorStop(0.5, `rgba(${B_RGB.red},${0.16 * k})`); rg.addColorStop(1, `rgba(${B_RGB.red},0)`);
  ctx.save(); ctx.scale(1, bw / L); ctx.fillStyle = rg; ctx.fillRect(-L, -L, L * 2, L * 2); ctx.restore();
  const line = (len, rgb, al, lw) => { if (al <= 0.003) return; const lg = ctx.createLinearGradient(-len, 0, len, 0); lg.addColorStop(0, `rgba(${rgb},0)`); lg.addColorStop(0.22, `rgba(${rgb},${al})`); lg.addColorStop(0.78, `rgba(${rgb},${al})`); lg.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = lg; ctx.fillRect(-len, -lw / 2, len * 2, lw); };
  line(L, B_RGB.red, 0.95 * k, 2.5); line(L * 0.9, B_RGB.bone, 0.9 * Math.pow(k, 3), 1.5);
  ctx.restore();
}
function B_rulerIn(ctx, g, W, H, reveal, alpha) { // the ruler draws on from the centre; the 0 and 1 numerals fade up as the line passes them
  if (reveal <= 0 || alpha <= 0) return;
  const half = W * 0.62 * reveal;
  ctx.save(); ctx.beginPath(); ctx.rect(W / 2 - half, 0, half * 2, H); ctx.clip(); PR.ruler(ctx, g.x0 - g.inch, g.x1 + g.inch, g.ry, g.inch, C.bone, alpha, null, true); ctx.restore();
  const pass = win(half, g.inch * 0.5 - 20, g.inch * 0.5 + 40); if (pass <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha * pass; ctx.fillStyle = C.bone; PR.numeral(ctx, Math.max(11, g.inch * 0.085)); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('0', g.x0, g.ry + g.inch * 0.04); ctx.fillText('1', g.x1, g.ry + g.inch * 0.04); ctx.restore();
}
function B_ring(ctx, g, t, W, fadeMul) { // the single wave that leaves the mark on contact; t in seconds since contact, shared by fLockup and fLine
  if (t <= 0) return;
  const R = g.mr * 0.82 + W * 0.75 * (1 - Math.exp(-t / 2.2)), w = 7 + 42 * Math.exp(-t * 3.2), a = 0.75 * Math.exp(-t / 0.85) * (fadeMul == null ? 1 : fadeMul);
  B_softRing(ctx, g.mcx, g.mcy, R - w, R + w * 0.8, B_RGB.red, a, 0.6);
  if (t < 0.5) B_softRing(ctx, g.mcx, g.mcy, R - w * 0.4, R + w * 0.5, B_RGB.bone, a * 0.6 * (1 - t * 2), 0.55);
}
function B_pool(ctx, g, H, alpha) { B_glow(ctx, g.mcx, g.mcy + H * 0.08, H * 0.62, B_RGB.bone, alpha, 1.35, 1); }

// ---------- frame 9: the lockup ----------
function fLockup(ctx, p, W, H) {
  const g = lockupGeom(W, H), dp1 = 1 / 90, T0 = B_T0, tRing = (p - T0) * 3, landed = p >= T0;
  // two-frame camera jolt on contact
  const k = Math.floor((p - T0) * 90 + 1e-6); const jolt = k === 0 ? [7, -4] : k === 1 ? [-4, 3] : [0, 0];
  ctx.save(); ctx.translate(jolt[0], jolt[1]);
  // stage light pool behind the mark, with a pulse on contact
  B_pool(ctx, g, H, 0.035 * ease.out(win(p, 0, 0.25)) + (landed ? 0.12 * Math.exp(-tRing * 3.5) : 0));
  // the wave, behind everything
  B_ring(ctx, g, tRing, W);
  // ruler
  B_rulerIn(ctx, g, W, H, ease.out(win(p, 0.02, 0.34)), 0.8);
  // procedural mark: flies in, lands with a damped settle, then dissolves under the artwork over the last six frames of the cross-fade (never a hard cut;
  // by then the artwork is at >= 0.95 alpha, so the sub-pixel slivers of the trace outside the artwork's edges fade by under 40 levels a frame)
  const xf = win(p, 0.42, 0.6), pa = 1 - win(p, 0.5333, 0.6), flash = win(p, T0, T0 + 0.22), cutLen = B_MARK.slash.half * g.imgW * ease.out(win(p, T0, T0 + 0.1));
  if (pa > 0) {
    const m = B_motion(p), fadeIn = ease.out(win(p, 0.03, 0.1)), trailPx = Math.abs(B_travel(g, p) - B_travel(g, p - 2.1 * dp1)), speed = clamp(trailPx / 2.1 / 25, 0, 1);
    ctx.save(); if (landed) B_cutClip(ctx, g, cutLen);
    if (speed > 0.02 && fadeIn > 0) { // motion smear: the last 2.1 frames of travel sampled at <= 1.5 px spacing, alpha tapering along the trail
      const n = clamp(Math.ceil(trailPx / 1.5), 8, 40);
      for (let j = n; j >= 1; j--) B_blades(ctx, g, B_motion(p - (j / n) * 2.1 * dp1), (1.3 / n) * Math.pow(1 - j / n, 1.5) * speed * fadeIn * pa, 0);
    }
    B_blades(ctx, g, m, fadeIn * pa, clamp(1 - win(p, B_SW0, B_SW1) * 1.6, 0, 1));
    const oneA = ease.out(win(p, T0, T0 + 0.06)); B_one(ctx, g, oneA * pa, lerp(1.18, 1, oneA));
    ctx.restore();
    B_redLine(ctx, g, cutLen, win(p, T0, T0 + 0.05) * pa);
  }
  // the real artwork takes over: the mark cross-fades on top of its procedural twin, the wordmark rises in underneath
  if (xf > 0) B_lockupSlice(ctx, g, ease.out(xf), -0.02, B_MARK.split, 0);
  const wa = ease.out(win(p, 0.4, 0.56)), ma = ease.out(win(p, 0.46, 0.62));
  if (p >= 0.62) B_lockupSlice(ctx, g, 1, B_MARK.split, 0.9, 0);
  else { B_lockupSlice(ctx, g, wa, B_MARK.oneInch[0], B_MARK.oneInch[1], (1 - wa) * H * 0.012); B_lockupSlice(ctx, g, ma, B_MARK.media[0], 0.9, (1 - ma) * H * 0.012); }
  // the slash flashes through the mark on landing
  B_flash(ctx, g, flash, H);
  // readout
  const ra = ease.out(win(p, 0.56, 0.72));
  PR.label(ctx, '1.000 in', W / 2, g.ry + H * 0.15 + (1 - ra) * 6, C.red, Math.max(10, W * 0.017), 'center', ra);
  ctx.restore();
  PR.vignette(ctx, W, H, 0.5); B_grain(ctx, W, H, 0.03, p, 9);
}

// ---------- frame 10: the line ----------
function fLine(ctx, p, W, H) {
  const g = lockupGeom(W, H), tRing = (1 - B_T0) * 3 + p * 2;
  const out = 1 - ease.out(win(p, 0, 0.25)), fade = win(p, 0.86, 1), fadeS = fade * fade * (3 - 2 * fade);
  B_pool(ctx, g, H, 0.035 * (1 - win(p, 0.3, 0.8)));
  B_ring(ctx, g, tRing, W, 1 - win(p, 0.45, 0.8));
  if (out > 0) { PR.ruler(ctx, g.x0 - g.inch, g.x1 + g.inch, g.ry + (1 - out) * 8, g.inch, C.bone, 0.8 * out, -1, true); PR.label(ctx, '1.000 in', W / 2, g.ry + H * 0.15 + (1 - out) * 8, C.red, Math.max(10, W * 0.017), 'center', out); }
  drawLockup(ctx, g, 1);
  drawTagline(ctx, g, ease.inOut(win(p, 0.12, 0.62)), 1);
  if (fadeS > 0) { ctx.save(); ctx.fillStyle = C.screen; ctx.globalAlpha = fadeS; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  PR.vignette(ctx, W, H, 0.5); B_grain(ctx, W, H, 0.03 * (1 - fadeS), p, 10);
}

// base.js captured fHit/fLockup/fLine by reference when it built DRAW and CUTS, so the overrides must be rebound
// for the harness (DRAW) and the drawAt() pipeline (CUTS) to see them.
DRAW[4] = fHit; DRAW[9] = fLockup; DRAW[10] = fLine;
for (const B_f of CUTS.full) { if (B_f.n === 4) B_f.draw = fHit; if (B_f.n === 9) B_f.draw = fLockup; if (B_f.n === 10) B_f.draw = fLine; }
for (const B_f of CUTS.short) { if (B_f.n === 4) B_f.draw = fHit; if (B_f.n === 9) B_f.draw = fLockup; if (B_f.n === 10) B_f.draw = fLine; }
