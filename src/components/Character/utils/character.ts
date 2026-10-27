import * as THREE from "three";
import { DRACOLoader, GLTF, GLTFLoader } from "three-stdlib";
import { setCharTimeline, setAllTimeline } from "../../utils/GsapScroll";
import { decryptFile } from "./decrypt";

// The model has no cap, so build a baseball cap on the head bone (spine006) to follow
// head/mouse-look. Sizes are in head-bone space: eyebrows top out at y 1.72, ear tops at
// y 1.42, the forehead reaches z 1.3 and the head is about ±1.15 wide.
const addCap = (character: THREE.Object3D) => {
  const head = character.getObjectByName("spine006");
  if (!head) return;
  // A little neutral emissive keeps the cap reading white under the lavender lights.
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e8ea, roughness: 0.75, emissive: 0x3a3a3a });
  const seamMat = new THREE.MeshStandardMaterial({ color: 0xc4c4c8, roughness: 0.8 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const cap = new THREE.Group();

  // Crown: a low hemisphere tilted front-up, so its rim sits above the eyebrows at the
  // front, just above the ears at the sides and lower at the back.
  const sx = 1.25, sy = 0.9, sz = 1.24;
  const crownGeo = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  const crown = new THREE.Mesh(crownGeo, white);
  // Grey lining, so the lavender lights don't show a pink band inside the rim
  crown.add(new THREE.Mesh(crownGeo, new THREE.MeshStandardMaterial({ color: 0x77777c, roughness: 0.9, side: THREE.BackSide })));
  crown.scale.set(sx, sy, sz);
  crown.position.set(0, 1.5, 0.12);
  crown.rotation.x = -0.22;
  crown.updateMatrix();
  cap.add(crown);

  // Six panel seams and a top button (in the crown's unit-sphere space)
  for (let k = 0; k < 6; k++) {
    const phi = (k * Math.PI) / 3;
    const pts = Array.from({ length: 12 }, (_, i) => {
      const t = (i / 11) * (Math.PI / 2);
      return new THREE.Vector3(Math.sin(t) * Math.cos(phi), Math.cos(t), Math.sin(t) * Math.sin(phi)).multiplyScalar(1.004);
    });
    crown.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.01, 4), seamMat));
  }
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), white);
  button.position.y = 1;
  button.scale.set(1 / sx, 1 / sy, 1 / sz);
  crown.add(button);

  // Visor: front-only bill from the crown's front rim, arched down at the sides,
  // with a black band along its front edge. Its back part tucks under the crown.
  const W = 0.9, D = 0.85; // half-width, reach in front of the rim
  const front = new THREE.Vector3(0, 0, 1).applyMatrix4(crown.matrix);
  const side = new THREE.Vector3(W / sx, 0, Math.sqrt(1 - (W / sx) ** 2)).applyMatrix4(crown.matrix);
  const z0 = side.z - front.z; // the bill's sides meet the crown rim here
  const arch = (front.y - side.y) / (W * W);
  const outer = (t: number) => new THREE.Vector2(W * Math.cos(t), z0 + (D - z0) * Math.sin(t));
  const shape = new THREE.Shape(Array.from({ length: 41 }, (_, i) => outer((i / 40) * Math.PI)));
  shape.lineTo(-W, z0 - 0.5);
  shape.lineTo(W, z0 - 0.5);
  const visorGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false, curveSegments: 40 });
  visorGeo.rotateX(Math.PI / 2); // shape +y → +z (forward), thickness → -y
  const p = visorGeo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) - arch * p.getX(i) ** 2);
  visorGeo.computeVertexNormals();
  // The bill faces the lavender point light, so it gets a dimmer diffuse plus neutral emissive
  // to stay light grey; its underside is darker grey.
  const n = visorGeo.attributes.normal;
  const under = new THREE.Color(0x77777c), top = new THREE.Color(0xa8a8ac);
  visorGeo.setAttribute("color", new THREE.Float32BufferAttribute(
    Array.from({ length: n.count }, (_, i) => (n.getY(i) < -0.5 ? under : top).toArray()).flat(), 3
  ));
  const edge = Array.from({ length: 41 }, (_, i) => {
    const o = outer((i / 40) * Math.PI);
    return new THREE.Vector3(o.x, -0.03 - arch * o.x * o.x, o.y);
  });
  const visor = new THREE.Group().add(
    new THREE.Mesh(visorGeo, new THREE.MeshStandardMaterial({ color: 0xe8e8ea, roughness: 0.9, emissive: 0x6a6a6c, vertexColors: true })),
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 60, 0.04, 8), black)
  );
  visor.position.copy(front).add(new THREE.Vector3(0, 0.05, 0.06)); // clear of the forehead
  visor.rotation.x = 0.06; // bill tipped slightly down
  cap.add(visor);

  cap.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  head.add(cap);

  // Pull any hair above the crown's rim inside it; hair below the rim (sideburns) is untouched.
  const hair = head.getObjectByName("hair") as THREE.Mesh | undefined;
  if (hair) {
    hair.updateMatrix();
    const toCrown = crown.matrix.clone().invert().multiply(hair.matrix);
    const fromCrown = toCrown.clone().invert();
    const pos = hair.geometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(toCrown);
      if (v.y > -0.05 && v.length() > 0.95) {
        v.setLength(0.95).applyMatrix4(fromCrown);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
    }
    pos.needsUpdate = true;
  }
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
