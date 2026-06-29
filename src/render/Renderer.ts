import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { CONFIG, GRID_W, GRID_H } from "../config";
import type { World } from "../sim/World";
import { writeColor } from "./colors";

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private quad: THREE.Mesh;
  private texture: THREE.DataTexture;
  private buffer: Uint8Array<ArrayBuffer>;

  // Layout (CSS px) for screen<->grid mapping.
  private drawW = 1; private drawH = 1; private offX = 0; private offY = 0;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(CONFIG.background, 1);
    this.canvas = this.renderer.domElement;
    container.appendChild(this.canvas);

    this.buffer = new Uint8Array(GRID_W * GRID_H * 4);
    this.texture = new THREE.DataTexture(this.buffer, GRID_W, GRID_H, THREE.RGBAFormat);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    // DataTexture origin is bottom-left; our grid y grows downward — flip so
    // gravity points down on screen.
    this.texture.flipY = true;
    this.texture.needsUpdate = true;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.MeshBasicMaterial({ map: this.texture });
    this.quad = new THREE.Mesh(geo, mat);
    this.scene.add(this.quad);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(GRID_W, GRID_H),
      CONFIG.bloom.strength, CONFIG.bloom.radius, CONFIG.bloom.threshold,
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  setBloom(enabled: boolean): void {
    this.bloom.enabled = enabled;
  }

  resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);

    // Fit the grid into the window preserving aspect (letterbox), nearest upscale.
    const gridAspect = GRID_W / GRID_H;
    const winAspect = w / h;
    if (winAspect > gridAspect) { this.drawH = h; this.drawW = h * gridAspect; }
    else { this.drawW = w; this.drawH = w / gridAspect; }
    this.offX = (w - this.drawW) / 2;
    this.offY = (h - this.drawH) / 2;
    this.quad.scale.set(this.drawW / w, this.drawH / h, 1);
  }

  /** Convert a client (CSS px) point to integer grid coords. Returns null if outside. */
  screenToGrid(clientX: number, clientY: number): { x: number; y: number } | null {
    const gx = Math.floor(((clientX - this.offX) / this.drawW) * GRID_W);
    const gy = Math.floor(((clientY - this.offY) / this.drawH) * GRID_H);
    if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) return null;
    return { x: gx, y: gy };
  }

  /** Rebuild the framebuffer from the world and draw. */
  render(world: World): void {
    const mat = world.material, tint = world.tint, extra = world.extra;
    const buf = this.buffer;
    const frame = world.frame;
    const n = GRID_W * GRID_H;
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      writeColor(buf, p, mat[i], tint[i], extra[i], frame);
    }
    this.texture.needsUpdate = true;
    this.composer.render();
  }
}
