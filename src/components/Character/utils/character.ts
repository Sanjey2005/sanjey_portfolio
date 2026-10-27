import * as THREE from "three";
import { DRACOLoader, GLTF, GLTFLoader, TessellateModifier, mergeVertices } from "three-stdlib";
import { setCharTimeline, setAllTimeline } from "../../utils/GsapScroll";
import { decryptFile } from "./decrypt";

// The model has no cap, so build a six-panel baseball cap on the head bone (spine006) so
// it follows head/mouse-look. Everything is in head-bone space. The face mesh is only a
// front mask (±0.93 wide at the temples); the hair mesh is the rest of the skull.
// The crown is an egg fitted just outside the face mask: centre (0, 1.5, 0.5), half-width
// 0.98, 0.87 to the front, 1.47 to the back, 0.9 up (1.4 down, for the hair tuck below).
const C = new THREE.Vector3(0, 1.5, 0.5);
const RX = 0.98, RY_UP = 0.9, RY_DOWN = 1.4, RZ_FRONT = 0.87, RZ_BACK = 1.47;
// Rim height by azimuth: above the eyebrows at the front, above the ears at the sides,
// a little higher than the nape at the back, with an arched strap opening (±0.45 rad).
const BACK_GAP = 0.45;
const baseRimY = (phi: number) => {
  const c = Math.cos(phi);
  return 1.45 + 0.47 * Math.max(c, 0) - 0.1 * Math.max(-c, 0);
};
const rimY = (phi: number) => {
  const fromBack = Math.acos(-Math.cos(phi));
  return baseRimY(phi) + 0.2 * Math.sqrt(Math.max(0, 1 - (fromBack / BACK_GAP) ** 2));
};
const egg = (theta: number, phi: number, scale = 1) => {
  const cy = Math.cos(theta), sy = Math.sin(theta);
  return new THREE.Vector3(
    RX * sy * Math.sin(phi) * scale,
    C.y + (cy > 0 ? RY_UP : RY_DOWN) * cy * scale,
    C.z + (Math.cos(phi) > 0 ? RZ_FRONT : RZ_BACK) * sy * Math.cos(phi) * scale
  );
};
const rimTheta = (phi: number, rim = rimY) => {
  const dy = rim(phi) - C.y;
  return Math.acos(THREE.MathUtils.clamp(dy / (dy > 0 ? RY_UP : RY_DOWN), -1, 1));
};
// Grid of points → indexed mesh; wrapU joins the last column to the first.
const gridGeometry = (rows: THREE.Vector3[][], flip: boolean, wrapU = false) => {
  const cols = rows[0].length;
  const geo = new THREE.BufferGeometry().setFromPoints(rows.flat());
  const index: number[] = [];
  for (let i = 0; i < rows.length - 1; i++)
    for (let j = 0; j < (wrapU ? cols : cols - 1); j++) {
      const a = i * cols + j, b = (i + 1) * cols + j;
      const c = i * cols + ((j + 1) % cols), d = (i + 1) * cols + ((j + 1) % cols);
      index.push(...(flip ? [a, b, c, c, b, d] : [a, c, b, b, c, d]));
    }
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
};

const addCap = (character: THREE.Object3D) => {
  const head = character.getObjectByName("spine006");
  if (!head) return;
  // Neutral emissive keeps the white parts white under the lavender lights.
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8, emissive: 0x404040 });
  const seamMat = new THREE.MeshStandardMaterial({ color: 0xc6c6ca, roughness: 0.85, emissive: 0x202020 });
  const under = new THREE.MeshStandardMaterial({ color: 0x55555a, roughness: 0.9, emissive: 0x141414, side: THREE.DoubleSide });
  const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const cap = new THREE.Group();

  // Crown: the egg above the rim curve, rim row first, apex last
  const SEG = 72, ROWS = 18;
  const crownRows = Array.from({ length: ROWS + 1 }, (_, i) =>
    Array.from({ length: SEG }, (_, j) => {
      const phi = (j / SEG) * Math.PI * 2;
      return egg(rimTheta(phi) * (1 - i / ROWS), phi);
    })
  );
  const crownGeo = gridGeometry(crownRows, false, true);
  cap.add(new THREE.Mesh(crownGeo, white));
  cap.add(new THREE.Mesh(crownGeo, new THREE.MeshStandardMaterial({ color: 0x77777c, roughness: 0.9, side: THREE.BackSide })));

  // Six panel seams and the top button
  for (let k = 0; k < 6; k++) {
    const phi = (k * Math.PI) / 3;
    const pts = Array.from({ length: 16 }, (_, i) => egg(rimTheta(phi) * (1 - i / 15), phi, 1.006));
    cap.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.008, 4), seamMat));
  }
  // Strap across the back opening, along the rim it would otherwise have
  const strap = Array.from({ length: 13 }, (_, i) => {
    const phi = Math.PI + BACK_GAP * 1.1 * (i / 6 - 1);
    return egg(rimTheta(phi, baseRimY), phi, 1.012).setY(baseRimY(phi) + 0.05);
  });
  cap.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strap), 24, 0.035, 6), seamMat));
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 8), white);
  button.position.copy(egg(0, 0)).y += 0.02;
  button.scale.y = 0.55;
  cap.add(button);

  // Bill: from the front rim (±70°), tapering to the sides, angled down, with thickness,
  // a darker underside and a rounded black front edge. Its first row tucks under the crown.
  const SPAN = THREE.MathUtils.degToRad(70), LEN = 0.78, DROP = Math.sin(0.08), TH = 0.05;
  const V = [-0.1, 0, 0.25, 0.5, 0.75, 1];
  const billTop = V.map((v) =>
    Array.from({ length: 41 }, (_, k) => {
      const u = k / 20 - 1, phi = u * SPAN;
      const rim = egg(rimTheta(phi), phi);
      const out = new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi)).lerp(new THREE.Vector3(0, 0, 1), 0.5).normalize();
      const len = v < 0 ? v : v * LEN * Math.sqrt(1 - u * u);
      return rim.addScaledVector(out, len).setY(rim.y - Math.max(len, 0) * DROP);
    })
  );
  const billBottom = billTop.map((row) => row.map((p) => p.clone().setY(p.y - TH)));
  // The bill's top faces the magenta-ish key light, so its albedo is half-way to the inverse
  // tint (fully inverse turns green when the head tips down) plus a neutral emissive.
  const billWhite = new THREE.MeshStandardMaterial({ color: 0xcde6d2, roughness: 0.9, emissive: 0x646464 });
  cap.add(new THREE.Mesh(gridGeometry(billTop, true), billWhite));
  cap.add(new THREE.Mesh(gridGeometry(billBottom, false), under));
  const edge = billTop[V.length - 1].map((p) => p.clone().setY(p.y - TH / 2));
  cap.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 80, TH / 2 + 0.012, 8), black));

  cap.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  head.add(cap);

  // Tuck the hair: above the rim it goes just inside the crown; just below the rim it may
  // only sit slightly outside the crown's continued silhouette (short sideburns, no bulge).
  const hair = head.getObjectByName("hair") as THREE.Mesh | undefined;
  if (!hair) return;
  hair.updateMatrix();
  // The hair mesh is coarse (485 vertices); subdivide it (edges ≤ ~0.08 in head space) so
  // the tuck and the hairline fade come out smooth.
  hair.geometry = mergeVertices(new TessellateModifier(0.008, 6).modify(hair.geometry));
  const toHead = hair.matrix, toHair = hair.matrix.clone().invert();
  const pos = hair.geometry.attributes.position;
  const v = new THREE.Vector3();
  // The hair mesh is also the back of the skull, so below a short-haircut hairline it is
  // recoloured to skin instead of cut away: just under the cap's back edge, sweeping down
  // behind the ears to the sideburns, which stay hair.
  const HAIR = new THREE.Color(0x080808), SKIN = new THREE.Color(0xd09468), mix = new THREE.Color();
  const colors: number[] = [];
  const hairlineY = (phi: number) => {
    const fromBack = Math.acos(-Math.cos(phi)), edge = Math.PI / 2 - 0.35;
    return fromBack <= edge
      ? 0.95 - 0.2 * (fromBack / edge) ** 2
      : THREE.MathUtils.lerp(0.75, -1, (fromBack - edge) / 0.35);
  };
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(toHead);
    const dy = v.y - C.y, dz = v.z - C.z;
    const ry = dy > 0 ? RY_UP : RY_DOWN, rz = dz > 0 ? RZ_FRONT : RZ_BACK;
    const ux = v.x / RX, uy = dy / ry, uz = dz / rz;
    const phi = Math.atan2(ux, uz);
    const r = Math.hypot(ux, uy, uz);
    if (v.y > rimY(phi) - 0.03) {
      if (r > 0.95) v.set(0, C.y, C.z).add(new THREE.Vector3(ux * RX, uy * ry, uz * rz).multiplyScalar(0.95 / r));
    } else {
      const uh = Math.hypot(ux, uz), allowed = 1.05 * Math.sqrt(Math.max(0, 1 - uy * uy));
      const w = THREE.MathUtils.smoothstep(v.y, 0.75, 1.0);
      if (uh > allowed && w > 0) {
        const k = THREE.MathUtils.lerp(1, allowed / uh, w);
        v.set(v.x * k, v.y, C.z + dz * k);
      }
    }
    const hl = hairlineY(phi);
    // Behind the ears, slim the lower back of the head: below y 0.7 the face mask wraps
    // round the back (z -0.7) and becomes the nape, so the hair tucks just inside it there
    // and blends back to its own surface by y 1.05 (no ledge, no hood).
    const behind = 1 - THREE.MathUtils.smoothstep(v.z, 0, 0.5);
    const k = THREE.MathUtils.lerp(1, THREE.MathUtils.lerp(0.72, 1, THREE.MathUtils.smoothstep(v.y, 0.62, 1.05)), behind);
    v.set(v.x * k, v.y, -0.1 + (v.z + 0.1) * k);
    // Soft fade (the hair mesh is too coarse for a crisp edge)
    colors.push(...mix.lerpColors(SKIN, HAIR, THREE.MathUtils.smoothstep(v.y, hl - 0.2, hl + 0.08)).toArray());
    v.applyMatrix4(toHair);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  hair.geometry.computeVertexNormals();
  hair.geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const hairMat = hair.material as THREE.MeshStandardMaterial;
  hairMat.color.set(0xffffff);
  hairMat.vertexColors = true;
  hairMat.needsUpdate = true;
};

const setCharacter = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
) => {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  loader.setDRACOLoader(dracoLoader);

  const loadCharacter = () => {
    return new Promise<GLTF | null>(async (resolve, reject) => {
      try {
        const encryptedBlob = await decryptFile(
          "/models/character.enc",
          "Character3D#@"
        );
        const blobUrl = URL.createObjectURL(new Blob([encryptedBlob]));

        let character: THREE.Object3D;
        loader.load(
          blobUrl,
          async (gltf) => {
            character = gltf.scene;
            await renderer.compileAsync(character, camera, scene);
            type MatOverride = {
              color: number;
              roughness: number;
              metalness: number;
              clearMap?: boolean;
            };
            // Keys are three.js-sanitised node names (dots stripped: "BODY.SHIRT" → "BODYSHIRT").
            const meshOverrides: Record<string, MatOverride> = {
              // Skin – warm light tan, matte (Plane007 is the face)
              "Plane007":   { color: 0xd09468, roughness: 0.8,  metalness: 0, clearMap: true },
              "Neck":       { color: 0xd09468, roughness: 0.8,  metalness: 0, clearMap: true },
              "Hand":       { color: 0xd09468, roughness: 0.8,  metalness: 0, clearMap: true },
              "Ear001":     { color: 0xd09468, roughness: 0.8,  metalness: 0, clearMap: true },
              // Hair – black; only the sideburns show under the cap
              "hair":       { color: 0x080808, roughness: 0.85, metalness: 0, clearMap: true },
              // Eyebrows – stay thick black
              "Eyebrow":    { color: 0x0a0a0a, roughness: 0.9,  metalness: 0, clearMap: true },
              // Sweatshirt – dark charcoal grey, matte
              "BODYSHIRT":  { color: 0x3a3a3f, roughness: 1.0,  metalness: 0, clearMap: true },
              // Trousers – dark grey-black
              "Pant":       { color: 0x222225, roughness: 1.0,  metalness: 0, clearMap: true },
              // Shoes – chunky white matte slip-on look
              "Shoe":       { color: 0xefefef, roughness: 0.92, metalness: 0, clearMap: true },
              "Sole":       { color: 0xe8e8e8, roughness: 0.95, metalness: 0, clearMap: true },
              // Chair – white shell, wooden legs
              "Plane":      { color: 0xf2f2f2, roughness: 0.6,  metalness: 0 },
              "Cube002":    { color: 0xa87545, roughness: 0.7,  metalness: 0 },
              // Desk legs – dark
              "Plane003":   { color: 0x1a1a1a, roughness: 0.6,  metalness: 0 },
              // Keyboard – white
              "Keyboard":   { color: 0xf0f0f0, roughness: 0.6,  metalness: 0 },
              "KEYS":       { color: 0xffffff, roughness: 0.5,  metalness: 0 },
            };
            character.traverse((child: any) => {
              if (child.isMesh) {
                const mesh = child as THREE.Mesh;
                child.castShadow = true;
                child.receiveShadow = true;
                mesh.frustumCulled = true;
                const override =
                  meshOverrides[child.name.startsWith("KEYS") ? "KEYS" : child.name];
                if (override) {
                  // Many meshes share the GLB's "default" material; clone so each override sticks.
                  const mats = (Array.isArray(mesh.material)
                    ? mesh.material
                    : [mesh.material]
                  ).map((m) => m.clone());
                  mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
                  mats.forEach((mat: any) => {
                    if (!mat) return;
                    if (mat.color)     mat.color.set(override.color);
                    mat.roughness    = override.roughness;
                    mat.metalness    = override.metalness;
                    if (override.clearMap) {
                      mat.map          = null;
                      mat.roughnessMap = null;
                      mat.metalnessMap = null;
                      mat.emissiveMap  = null;
                      mat.emissive?.set(0x000000);
                    }
                    mat.needsUpdate  = true;
                  });
                }
              }
            });
            addCap(character);
            // Dev-only hook for the cap turntable check: /?capdebug
            if (import.meta.env.DEV && new URLSearchParams(location.search).has("capdebug"))
              ((window as any).__capdebug ||= []).push({ character, camera, scene });
            resolve(gltf);
            setCharTimeline(character, camera);
            setAllTimeline();
            character!.getObjectByName("footR")!.position.y = 3.36;
            character!.getObjectByName("footL")!.position.y = 3.36;
            dracoLoader.dispose();
          },
          undefined,
          (error) => {
            console.error("Error loading GLTF model:", error);
            reject(error);
          }
        );
      } catch (err) {
        reject(err);
        console.error(err);
      }
    });
  };

  return { loadCharacter };
};

export default setCharacter;
