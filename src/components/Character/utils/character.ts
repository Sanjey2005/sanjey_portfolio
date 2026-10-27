import * as THREE from "three";
import { DRACOLoader, GLTF, GLTFLoader } from "three-stdlib";
import { setCharTimeline, setAllTimeline } from "../../utils/GsapScroll";
import { decryptFile } from "./decrypt";

// The model has no cap, so build one on the head bone (spine006) to follow head/mouse-look.
// Sizes are in head-bone space: eyebrows sit at y 1.52–1.72, the face top at y 2.0,
// and the hair spans x ±1.15, z -0.97–1.3.
const addCap = (character: THREE.Object3D) => {
  const head = character.getObjectByName("spine006");
  if (!head) return;
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e8ea, roughness: 0.75, side: THREE.DoubleSide });
  const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const cap = new THREE.Group();

  // Crown: a hemisphere stretched over the hair
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    white
  );
  crown.scale.set(1.28, 1.1, 1.4);
  cap.add(crown);

  // Visor: a flat crescent in front of the crown, black band along its outer edge
  const R = 1.28, D = 0.8; // crown radius, brim depth
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, R + 0.05, R + D, 0, Math.PI, false, 0);
  shape.absellipse(0, 0, R, R, Math.PI, 0, true, 0);
  const brim = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false, curveSegments: 40 }),
    white
  );
  brim.rotation.x = Math.PI / 2; // shape +y → cap +z (forward)
  const edge = new THREE.EllipseCurve(0, 0, R + 0.05, R + D, 0, Math.PI);
  const band = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(edge.getPoints(40).map((p) => new THREE.Vector3(p.x, -0.03, p.y))),
      60, 0.045, 8
    ),
    black
  );
  const visor = new THREE.Group().add(brim, band);
  // Tip the brim down about its inner edge so it stays attached to the crown.
  const tip = 0.06;
  visor.rotation.x = tip;
  visor.position.set(0, R * Math.sin(tip), R * (1 - Math.cos(tip)));
  cap.add(visor);

  cap.position.set(0, 2.02, 0.2);
  cap.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  head.add(cap);

  // ponytail: flatten the hair top so it stays inside the crown; sideburns untouched.
  // The hair mesh is tilted on the bone, so its front edge ends up ~0.13 above maxY.
  const hair = head.getObjectByName("hair") as THREE.Mesh | undefined;
  if (hair) {
    const pos = hair.geometry.attributes.position;
    const maxY = (1.98 - hair.position.y) / hair.scale.y;
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) > maxY) pos.setY(i, maxY);
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
