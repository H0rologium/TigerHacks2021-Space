
import { GLTFLoader } from "../js/three/examples/jsm/loaders/GLTFLoader.js";

// import { OrbitControls } from "../js/three/examples/jsm/controls/OrbitControls.js";
// import { GLTFLoader } from "../js/three/examples/jsm/loaders/GLTFLoader.js";
// import { RGBELoader } from "../js/three/examples/jsm/loaders/RGBELoader.js";

import { RoughnessMipmapper } from "../js/three/examples/jsm/utils/RoughnessMipmapper.js";

export function assetLoader(renderer, assetFolder, assetName) {
  // use of RoughnessMipmapper is optional
  const roughnessMipmapper = new RoughnessMipmapper(renderer);

  const loader = new GLTFLoader().setPath(assetFolder + "/");
  loader.load(assetName, function (gltf) {
    gltf.scene.traverse(function (child) {
      if (child.isMesh) {
        roughnessMipmapper.generateMipmaps(child.material);
      }
    });
    roughnessMipmapper.dispose();
    return gltf.scene;
  });
}
