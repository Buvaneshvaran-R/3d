import re

path = r"d:\3d\src\components\FloorVisualizer.tsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

old_pathway = """    // Pathway - light concrete color
    const pathwayGeometry = new THREE.PlaneGeometry(8, 50);
    const pathwayMaterial = new THREE.MeshStandardMaterial({
      color: 0xd3d3d3,
      roughness: 0.6,
      metalness: 0.1
    });
    const pathwayMesh = new THREE.Mesh(pathwayGeometry, pathwayMaterial);
    pathwayMesh.rotation.x = -Math.PI / 2;
    pathwayMesh.position.y = 0.02;
    pathwayMesh.receiveShadow = true;
    scene.add(pathwayMesh);"""

new_pathway_and_fountain = """    // --- ROADS AND PATHWAYS ---
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xd3d3d3, roughness: 0.6 });

    // Main horizontal road connecting buildings
    const mainRoad = new THREE.Mesh(new THREE.PlaneGeometry(240, 16), roadMat);
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.position.set(0, 0.02, 35);
    mainRoad.receiveShadow = true;
    scene.add(mainRoad);

    // Branch paths to each building
    [-80, 0, 80].forEach(bx => {
      const branch = new THREE.Mesh(new THREE.PlaneGeometry(10, 24), pathMat);
      branch.rotation.x = -Math.PI / 2;
      branch.position.set(bx, 0.03, 19);
      branch.receiveShadow = true;
      scene.add(branch);
    });

    // --- CENTRAL FOUNTAIN ---
    const fountainGroup = new THREE.Group();
    fountainGroup.position.set(0, 0.04, 35); // Center of the road/plaza
    
    // Fountain base ring
    const baseGeo = new THREE.CylinderGeometry(7, 7, 0.6, 32);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9 });
    const fBase = new THREE.Mesh(baseGeo, baseMat);
    fBase.position.y = 0.3;
    fBase.castShadow = true; fBase.receiveShadow = true;
    fountainGroup.add(fBase);

    // Water pool
    const waterGeo = new THREE.CylinderGeometry(6.2, 6.2, 0.5, 32);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, transparent: true, opacity: 0.75, roughness: 0.1 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = 0.4;
    fountainGroup.add(water);

    // Center column
    const colGeo = new THREE.CylinderGeometry(1.8, 2.5, 2.5, 16);
    const centerCol = new THREE.Mesh(colGeo, baseMat);
    centerCol.position.y = 1.25;
    centerCol.castShadow = true;
    fountainGroup.add(centerCol);

    // Upper water bowl
    const bowlGeo = new THREE.CylinderGeometry(3.5, 1.8, 0.5, 16);
    const bowl = new THREE.Mesh(bowlGeo, baseMat);
    bowl.position.y = 2.5;
    bowl.castShadow = true;
    fountainGroup.add(bowl);
    
    const waterBowl = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.2, 16), waterMat);
    waterBowl.position.y = 2.7;
    fountainGroup.add(waterBowl);

    // Top spout
    const spoutGeo = new THREE.CylinderGeometry(0.6, 1.0, 1.8, 8);
    const spout = new THREE.Mesh(spoutGeo, baseMat);
    spout.position.y = 3.6;
    spout.castShadow = true;
    fountainGroup.add(spout);

    // Water stream
    const streamGeo = new THREE.CylinderGeometry(0.3, 0.8, 2.5, 8);
    const streamMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6, emissive: 0x1166aa });
    const stream = new THREE.Mesh(streamGeo, streamMat);
    stream.position.y = 5.2;
    fountainGroup.add(stream);

    scene.add(fountainGroup);"""

if old_pathway in text:
    text = text.replace(old_pathway, new_pathway_and_fountain)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Replaced successfully!")
else:
    print("Could not find the old pathway code to replace.")

