import * as THREE from "three";
import { DRACOLoader, GLTF, GLTFLoader } from "three-stdlib";
import { setCharTimeline, setAllTimeline } from "../../utils/GsapScroll";
import { decryptFile } from "./decrypt";

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
            const meshOverrides: Record<string, MatOverride> = {
              // Skin – warm medium brown, matte
              "Neck":       { color: 0x9b6b3a, roughness: 0.88, metalness: 0, clearMap: true },
              "Hand":       { color: 0x9b6b3a, roughness: 0.88, metalness: 0, clearMap: true },
              "Ear.001":    { color: 0x9b6b3a, roughness: 0.88, metalness: 0, clearMap: true },
              // Hair → white cap approximation
              "hair":       { color: 0x080808, roughness: 0.85, metalness: 0, clearMap: true },
              // Eyebrows – stay thick black
              "Eyebrow":    { color: 0x0a0a0a, roughness: 0.9,  metalness: 0, clearMap: true },
              // Shirt – soft matte dark grey (not shiny)
              "BODY.SHIRT": { color: 0x282828, roughness: 1.0,  metalness: 0, clearMap: true },
              // Pants – matching matte dark grey
              "Pant":       { color: 0x242424, roughness: 1.0,  metalness: 0, clearMap: true },
              // Shoes – chunky white matte slip-on look
              "Shoe":       { color: 0xefefef, roughness: 0.92, metalness: 0, clearMap: true },
              "Sole":       { color: 0xe8e8e8, roughness: 0.95, metalness: 0, clearMap: true },
            };
            character.traverse((child: any) => {
              if (child.isMesh) {
                const mesh = child as THREE.Mesh;
                child.castShadow = true;
                child.receiveShadow = true;
                mesh.frustumCulled = true;
                const override = meshOverrides[child.name];
                if (override) {
                  const mats = Array.isArray(mesh.material)
                    ? mesh.material
                    : [mesh.material];
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
