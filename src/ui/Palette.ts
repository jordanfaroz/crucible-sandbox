import type { Brush } from "../input/Brush";
import { PALETTE_ORDER, MAT, Mat } from "../sim/materials";
import type { PresetName } from "../sim/presets";
import { CONFIG } from "../config";

export interface UIController {
  isPaused(): boolean;
  togglePause(): void;
  step(): void;
  clear(): void;
  setBloom(on: boolean): void;
  loadPreset(name: PresetName): void;
}

const CSS = `
#ui { position: fixed; top: 10px; left: 10px; display: flex; flex-direction: column;
  gap: 10px; font: 12px ui-monospace, Menlo, Consolas, monospace; color: #c9d2e0;
  user-select: none; }
#ui .panel { background: rgba(12,14,22,0.82); border: 1px solid #1e2433;
  border-radius: 8px; padding: 8px; backdrop-filter: blur(4px); }
#ui h2 { font-size: 10px; letter-spacing: .12em; text-transform: uppercase;
  color: #6b7488; margin-bottom: 6px; font-weight: 600; }
#mats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; max-width: 200px; }
#mats button { display: flex; align-items: center; gap: 5px; background: #171c28;
  border: 1px solid #232a3a; color: #c9d2e0; border-radius: 5px; padding: 4px 5px;
  cursor: pointer; font: inherit; text-align: left; }
#mats button:hover { border-color: #3a445e; }
#mats button.sel { border-color: #7aa2ff; box-shadow: 0 0 0 1px #7aa2ff inset; }
#mats .sw { width: 11px; height: 11px; border-radius: 3px; flex: none;
  box-shadow: 0 0 4px rgba(255,255,255,0.08) inset; }
#controls button { background: #171c28; border: 1px solid #232a3a; color: #c9d2e0;
  border-radius: 5px; padding: 5px 9px; cursor: pointer; font: inherit; margin: 2px; }
#controls button:hover { border-color: #3a445e; }
#controls .row { display: flex; flex-wrap: wrap; align-items: center; }
#controls label { display: flex; align-items: center; gap: 6px; margin: 4px 2px; }
#hud { position: fixed; bottom: 10px; left: 10px; font: 11px ui-monospace, monospace;
  color: #5f6b82; background: rgba(12,14,22,0.7); padding: 5px 8px; border-radius: 6px;
  border: 1px solid #1e2433; }
#hint { position: fixed; bottom: 10px; right: 10px; font: 11px ui-monospace, monospace;
  color: #4a5266; text-align: right; line-height: 1.5; }
`;

export class Palette {
  private hud!: HTMLElement;

  constructor(
    private brush: Brush,
    private ctrl: UIController,
  ) {
    this.build();
    this.brush.onPick = (m) => this.select(m);
  }

  private build(): void {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    const root = document.createElement("div");
    root.id = "ui";

    // --- materials ---
    const matPanel = document.createElement("div");
    matPanel.className = "panel";
    matPanel.innerHTML = `<h2>Materials</h2>`;
    const grid = document.createElement("div");
    grid.id = "mats";
    for (const id of PALETTE_ORDER) {
      const m = MAT(id);
      const btn = document.createElement("button");
      btn.dataset.mat = String(id);
      const [r, g, b] = m.color;
      btn.innerHTML = `<span class="sw" style="background:rgb(${r},${g},${b})"></span>${m.name}`;
      btn.onclick = () => this.select(id);
      grid.appendChild(btn);
    }
    matPanel.appendChild(grid);
    root.appendChild(matPanel);

    // --- controls ---
    const ctl = document.createElement("div");
    ctl.className = "panel";
    ctl.id = "controls";
    ctl.innerHTML = `<h2>Controls</h2>`;

    const row1 = document.createElement("div");
    row1.className = "row";
    const pauseBtn = mkBtn("Pause", () => { this.ctrl.togglePause(); pauseBtn.textContent = this.ctrl.isPaused() ? "Play" : "Pause"; });
    const stepBtn = mkBtn("Step", () => this.ctrl.step());
    const clearBtn = mkBtn("Clear", () => this.ctrl.clear());
    row1.append(pauseBtn, stepBtn, clearBtn);
    ctl.appendChild(row1);

    const row2 = document.createElement("div");
    row2.className = "row";
    const sizeLabel = document.createElement("label");
    sizeLabel.innerHTML = `Brush <input id="bsize" type="range" min="${CONFIG.brushMin}" max="${CONFIG.brushMax}" value="${this.brush.radius}">`;
    const slider = sizeLabel.querySelector("input") as HTMLInputElement;
    slider.oninput = () => this.brush.setRadius(parseInt(slider.value, 10));
    row2.appendChild(sizeLabel);
    ctl.appendChild(row2);

    const row3 = document.createElement("div");
    row3.className = "row";
    const bloomLabel = document.createElement("label");
    bloomLabel.innerHTML = `<input id="bloom" type="checkbox" checked> Bloom`;
    const bloomCb = bloomLabel.querySelector("input") as HTMLInputElement;
    bloomCb.onchange = () => this.ctrl.setBloom(bloomCb.checked);
    row3.appendChild(bloomLabel);
    ctl.appendChild(row3);
    root.appendChild(ctl);

    // --- presets ---
    const pre = document.createElement("div");
    pre.className = "panel";
    pre.innerHTML = `<h2>Presets</h2>`;
    const prow = document.createElement("div");
    prow.className = "row";
    const presets: [string, PresetName][] = [
      ["Dam", "dam"], ["Oil Pit", "oilpit"], ["Lava Cave", "lavacave"], ["Garden", "garden"],
      ["Powder Keg", "powderkeg"], ["Circuit", "circuit"], ["Frost", "frost"],
    ];
    for (const [label, name] of presets) prow.appendChild(mkBtn(label, () => this.ctrl.loadPreset(name)));
    pre.appendChild(prow);
    root.appendChild(pre);

    document.body.appendChild(root);

    // HUD + hints
    this.hud = document.createElement("div");
    this.hud.id = "hud";
    this.hud.textContent = "—";
    document.body.appendChild(this.hud);

    const hint = document.createElement("div");
    hint.id = "hint";
    hint.innerHTML = `drag: paint &nbsp; right-drag: erase &nbsp; alt-click: pick<br>wheel: brush size`;
    document.body.appendChild(hint);

    this.select(this.brush.material);
  }

  private select(id: Mat): void {
    this.brush.material = id;
    document.querySelectorAll<HTMLButtonElement>("#mats button").forEach((b) => {
      b.classList.toggle("sel", b.dataset.mat === String(id));
    });
  }

  setStats(fps: number, activeChunks: number, totalChunks: number, activeCells: number): void {
    this.hud.textContent =
      `${fps.toFixed(0)} fps   chunks ${activeChunks}/${totalChunks} awake   ~${activeCells.toLocaleString()} active cells`;
  }
}

function mkBtn(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.textContent = label;
  b.onclick = onClick;
  return b;
}
