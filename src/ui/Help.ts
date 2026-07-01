// In-app Help panel. Pure UI — no simulation impact. A slide-in side panel with
// a How-to guide, per-material descriptions, and a "things to try" list. Every
// screenshot is a data-driven slot that renders a labelled placeholder until a
// real image is dropped into public/assets/guide/<file> (then it just appears —
// no code change needed).
import { MAT, Mat } from "../sim/materials";

// Base URL so image paths resolve under a GitHub Pages sub-path too. (Read
// defensively — vite/client types aren't in this tsconfig.)
const BASE = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "./";

const CSS = `
#help-btn { position: fixed; top: 12px; right: 12px; z-index: 25;
  width: 30px; height: 30px; border-radius: 8px; background: #0b0d15;
  border: 1px solid #2a3346; color: #c9d2e0; cursor: pointer; font: 600 15px ui-monospace, monospace;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5); }
#help-btn:hover { border-color: #7aa2ff; color: #fff; }
#help-scrim { position: fixed; inset: 0; z-index: 40; background: rgba(3,4,8,0.5);
  opacity: 0; pointer-events: none; transition: opacity .18s ease; }
#help-scrim.open { opacity: 1; pointer-events: auto; }
#help { position: fixed; top: 0; right: 0; z-index: 41; height: 100%; width: 420px;
  max-width: 92vw; background: #0a0c13; border-left: 1px solid #232a3a;
  box-shadow: -8px 0 30px rgba(0,0,0,0.55); transform: translateX(100%);
  transition: transform .22s cubic-bezier(.4,0,.2,1); overflow-y: auto;
  color: #c3ccdb; font: 13px/1.55 ui-monospace, Menlo, Consolas, monospace; }
#help.open { transform: translateX(0); }
#help .hd { position: sticky; top: 0; background: #0a0c13ea; backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: space-between; padding: 14px 16px;
  border-bottom: 1px solid #1c2432; }
#help .hd h1 { font-size: 15px; letter-spacing: .04em; color: #eef2f8; font-weight: 700; }
#help .hd .x { width: 26px; height: 26px; border-radius: 6px; background: #141926;
  border: 1px solid #263049; color: #c9d2e0; cursor: pointer; font: 15px monospace; }
#help .hd .x:hover { border-color: #7aa2ff; color: #fff; }
#help .body { padding: 6px 16px 40px; }
#help h2 { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #7c88a0;
  margin: 22px 0 10px; font-weight: 700; border-bottom: 1px solid #1a212e; padding-bottom: 5px; }
#help h3 { font-size: 12.5px; letter-spacing: .1em; text-transform: uppercase; color: #9aa6bd;
  margin: 16px 0 6px; font-weight: 600; }
#help p { margin: 0 0 8px; color: #aeb8c9; }
#help .muted { color: #79839a; }
#help kbd { display: inline-block; background: #161d2b; border: 1px solid #2a3346;
  border-bottom-width: 2px; border-radius: 4px; padding: 1px 6px; color: #dbe3f0;
  font: 11px ui-monospace, monospace; }
#help ul.keys { list-style: none; margin: 0 0 10px; padding: 0; }
#help ul.keys li { display: flex; gap: 10px; align-items: baseline; padding: 4px 0;
  border-bottom: 1px solid #141a26; }
#help ul.keys li .k { flex: none; width: 118px; }
#help ul.keys li .d { color: #aeb8c9; }
#help .mat { display: flex; gap: 9px; padding: 8px 0; border-bottom: 1px solid #141a26; }
#help .mat .sw { flex: none; width: 15px; height: 15px; border-radius: 4px; margin-top: 2px;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.08) inset, 0 0 6px rgba(0,0,0,0.4); }
#help .mat .txt b { color: #e7ecf5; }
#help .mat .txt { color: #a6b0c2; }
#help .try-lead { margin: 16px 0 0; color: #aeb8c9; }
#help .try-lead b { color: #dce3ef; }
#help .shot { margin: 10px 0 14px; border-radius: 8px; overflow: hidden; background: #0d111b; }
#help .shot .ph { aspect-ratio: 16 / 9; border: 1px dashed #33405a; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; text-align: center;
  padding: 10px; color: #6b7488; font-size: 11.5px;
  background: repeating-linear-gradient(45deg,#0d111b,#0d111b 10px,#0f1420 10px,#0f1420 20px); }
#help .shot img { display: block; width: 100%; border-radius: 8px; }
#help .cap { font-size: 11px; color: #69728a; margin: 4px 2px 0; }
`;

/** A screenshot slot: tries public/assets/guide/<file>, else a labelled placeholder. */
function shot(file: string, caption: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "shot";
  const ph = document.createElement("div");
  ph.className = "ph";
  ph.textContent = `▣  ${caption}`;
  wrap.appendChild(ph);

  const img = new Image();
  img.onload = () => { wrap.innerHTML = ""; wrap.appendChild(img); };
  img.onerror = () => { /* keep the placeholder */ };
  img.alt = caption;
  img.src = `${BASE}assets/guide/${file}`;
  return wrap;
}

function el(tag: string, cls?: string, html?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

export class Help {
  private scrim!: HTMLElement;
  private panel!: HTMLElement;
  private body!: HTMLElement;
  private built = false;

  constructor() {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    const btn = el("button");
    btn.id = "help-btn";
    btn.textContent = "?";
    btn.title = "Help & guide";
    btn.onclick = () => this.toggle();
    document.body.appendChild(btn);

    this.scrim = el("div");
    this.scrim.id = "help-scrim";
    this.scrim.onclick = () => this.close();
    document.body.appendChild(this.scrim);

    this.panel = el("div");
    this.panel.id = "help";
    const hd = el("div", "hd", `<h1>Crucible — Guide</h1>`);
    const x = el("button", "x", "✕");
    x.title = "Close (Esc)";
    x.onclick = () => this.close();
    hd.appendChild(x);
    this.panel.appendChild(hd);
    this.body = el("div", "body");
    this.panel.appendChild(this.body);
    document.body.appendChild(this.panel);

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.panel.classList.contains("open")) this.close();
    });
  }

  toggle(): void { this.panel.classList.contains("open") ? this.close() : this.open(); }
  open(): void { if (!this.built) { this.render(); this.built = true; } this.scrim.classList.add("open"); this.panel.classList.add("open"); }
  close(): void { this.scrim.classList.remove("open"); this.panel.classList.remove("open"); }

  private render(): void {
    const b = this.body;

    // ---- Section 1: How to use ----
    b.appendChild(el("h2", undefined, "How to use"));
    const keys = el("ul", "keys");
    const rows: [string, string][] = [
      ["<kbd>Drag</kbd>", "Paint the selected material."],
      ["<kbd>Right-drag</kbd>", "Erase (paint air)."],
      ["<kbd>Alt</kbd> + click", "Eyedropper — pick the material under the cursor."],
      ["<kbd>Wheel</kbd> / Brush", "Change brush size."],
      ["<kbd>Pause</kbd> / <kbd>Step</kbd>", "Freeze the world and advance one frame at a time — great for watching a reaction resolve cell by cell."],
      ["<kbd>Clear</kbd>", "Wipe the world."],
      ["<kbd>Bloom</kbd>", "Toggle the glow on emissive materials (fire, lava, spark)."],
      ["Preset", "Click a preset to load a ready-made scene."],
    ];
    for (const [k, d] of rows) {
      const li = el("li");
      li.appendChild(el("span", "k", k));
      li.appendChild(el("span", "d", d));
      keys.appendChild(li);
    }
    b.appendChild(keys);
    b.appendChild(shot("toolbar.png", "the toolbar — palette, controls, presets"));

    // ---- Sections 2–4 are added by renderMaterials()/renderTry()/renderPresets() ----
    this.renderMaterials(b);
    this.renderTry(b);
    this.renderPresets(b);
  }

  // ---- Section 2: Materials (descriptions reconciled against materials.ts /
  //      reactions.ts — swatch colours are pulled live from the real config). ----
  protected renderMaterials(b: HTMLElement): void {
    b.appendChild(el("h2", undefined, "Materials"));

    b.appendChild(el("h3", undefined, "Powders · fall and pile"));
    b.appendChild(this.matRow(Mat.Sand,
      "Classic powder; piles at a natural angle and sinks through water. Fuses to <b>glass</b> where it meets lava."));
    b.appendChild(this.matRow(Mat.Salt,
      "Fine powder that piles like sand. Acid dissolves it. (It doesn't react with water in this sim.)"));
    b.appendChild(this.matRow(Mat.Gunpowder,
      "Volatile powder. Ignites on contact with fire, lava, an ember or a spark, then <b>detonates</b> — clearing and scattering nearby matter and throwing fire. Chains explosively through connected gunpowder."));
    b.appendChild(shot("powders.png", "powders piling"));

    b.appendChild(el("h3", undefined, "Liquids · flow and level; density decides what floats"));
    b.appendChild(this.matRow(Mat.Water,
      "Flows and pools. Sinks below oil, floats on lava. <b>Conducts electricity.</b> Turns lava to <b>stone</b> (flashing to steam), douses fire, and <b>freezes to ice</b> next to something cold."));
    b.appendChild(this.matRow(Mat.Oil,
      "Flammable and <b>lighter than water</b>, so it floats on top. Catches fire fast and burns hot — the start of most infernos."));
    b.appendChild(this.matRow(Mat.Lava,
      "Molten, glowing, heavy. Ignites anything flammable, turns sand to <b>glass</b>, <b>melts metal</b>, and hardens to <b>stone</b> when it meets water."));
    b.appendChild(this.matRow(Mat.Acid,
      "Corrosive. Eats through stone, sand, wood, plant, salt and gunpowder, consuming itself as it dissolves. (Metal and glass resist it.)"));
    b.appendChild(shot("liquids.png", "liquids layering by density"));

    b.appendChild(el("h3", undefined, "Gases · rise and disperse"));
    b.appendChild(this.matRow(Mat.Smoke,
      "Rises, drifts, and thins until it fades to air. The leftover breath of fire."));
    b.appendChild(this.matRow(Mat.Steam,
      "Rises and <b>condenses back to water</b> as it ages. Born where water meets fire or lava."));
    b.appendChild(this.matRow(Mat.FlammableGas,
      "Flammable. Rises and <b>pools into pockets and cavities</b>. A single spark or flame <b>flashes the whole connected pocket into a fireball</b> — handle with care."));
    b.appendChild(shot("gases.png", "gases pooling and rising"));

    b.appendChild(el("h3", undefined, "Solids · hold their shape"));
    b.appendChild(this.matRow(Mat.Stone,
      "Inert structure. Doesn't move or burn. Acid eats through it; lava forms it on contact with water."));
    b.appendChild(this.matRow(Mat.Wood,
      "Flammable structure. Catches fire and burns away, leaving <b>ash</b>."));
    b.appendChild(this.matRow(Mat.Metal,
      "Rigid and <b>conducts electricity</b> — build wires and circuits. <b>Melts to molten lava</b> in extreme heat."));
    b.appendChild(this.matRow(Mat.Ice,
      "Frozen solid. <b>Melts to water</b> near heat and spreads a <b>freezing front</b> into adjacent water."));
    b.appendChild(this.matRow(Mat.Glass,
      "Transparent solid formed when <b>sand meets lava</b>. Inert and non-flammable."));
    b.appendChild(this.matRow(Mat.Plant,
      "<b>Grows along water</b> into empty space. Flammable — fire races through a garden."));
    b.appendChild(shot("solids.png", "solids & structures"));

    b.appendChild(el("h3", undefined, "Energy"));
    b.appendChild(this.matRow(Mat.Fire,
      "Needs fuel: spreads to anything flammable, then dies down to smoke (and a little ash) when there's nothing left to burn. Glows and blooms."));
    b.appendChild(this.matRow(Mat.Spark,
      "An electric charge. <b>Rides along water and metal</b> as a single sweeping pulse that dissipates after one pass. <b>Ignites</b> gas, oil and gunpowder on contact."));
    b.appendChild(shot("energy.png", "fire and spark glowing"));
  }

  // ---- Section 3: Things to try ----
  protected renderTry(b: HTMLElement): void {
    b.appendChild(el("h2", undefined, "Things to try"));
    const items: [string, string, string][] = [
      ["Pour <b>Water</b> onto <b>Lava</b> → it hardens to Stone and hisses off Steam.", "try-water-lava.png", "water hitting lava → stone + steam"],
      ["Drop <b>Fire</b> into <b>Oil</b> → a spreading inferno.", "try-oil-fire.png", "oil fire spreading"],
      ["Run a <b>Spark</b> down a <b>Water</b> channel → watch the charge conduct.", "try-spark-water.png", "spark conducting through water"],
      ["Fire a <b>Spark</b> into a <b>Gas</b> pocket → the whole pocket flashes over.", "try-gas-flash.png", "gas flashback fireball"],
      ["Pour <b>Sand</b> onto <b>Lava</b> → a Glass crust forms.", "try-glass.png", "sand turning to glass"],
      ["Drip <b>Acid</b> onto a stacked <b>Stone &amp; Sand</b> wall → it eats straight through (metal resists).", "try-acid.png", "acid dissolving a wall"],
      ["Light a <b>Gunpowder</b> trail → chain explosions.", "try-gunpowder.png", "gunpowder chain blast"],
      ["Set <b>Lava</b> beside <b>Ice</b> → melt, flow, and refreeze at the cold edges.", "try-ice.png", "ice melting and refreezing"],
    ];
    for (const [text, file, cap] of items) {
      b.appendChild(el("p", "try-lead", text));
      b.appendChild(shot(file, cap));
    }
  }

  protected renderPresets(_b: HTMLElement): void {}

  /** Small helper for content rendering: a material row with its real swatch colour. */
  protected matRow(id: Mat, desc: string): HTMLElement {
    const m = MAT(id);
    const [r, g, b] = m.color;
    const row = el("div", "mat");
    const sw = el("span", "sw");
    sw.style.background = `rgb(${r},${g},${b})`;
    row.appendChild(sw);
    row.appendChild(el("div", "txt", `<b>${m.name}</b> — ${desc}`));
    return row;
  }
}
