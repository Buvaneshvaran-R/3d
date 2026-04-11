import re

path = r"d:\3d\src\components\CampusVisualizer.tsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

detail_funcs = """
function addRoofDetails(group: THREE.Group, width: number, depth: number, yPos: number) {
  const acMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8, metalness: 0.2 });
  const fanMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
  
  for(let i=0; i<4; i++) {
    const w = 1.2 + Math.random() * 1.5;
    const h = 0.8 + Math.random() * 0.8;
    const d = 1.2 + Math.random() * 1.5;
    const ac = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), acMat);
    const px = (Math.random() - 0.5) * (width * 0.6);
    const pz = (Math.random() - 0.5) * (depth * 0.6);
    ac.position.set(px, yPos + h/2, pz);
    ac.castShadow = true;
    group.add(ac);
    
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(w*0.35, w*0.35, 0.1, 8), fanMat);
    fan.position.set(px, yPos + h + 0.05, pz);
    group.add(fan);
  }
}

function addEntranceSteps(group: THREE.Group, width: number, depth: number) {
   const stepMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.9 });
   for(let i=0; i<4; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(12 + i*1.0, 0.2, 1.5), stepMat);
      step.position.set(0, 0.1 + (3-i)*0.2, depth/2 + 1 + i*0.5);
      step.castShadow = true; step.receiveShadow = true;
      group.add(step);
   }
}
"""

if "function addRoofDetails" not in text:
    text = text.replace("function createSmartAcademicBlock", detail_funcs + "\nfunction createSmartAcademicBlock")

if "addRoofDetails(group, width, depth, height);" not in text:
    text = text.replace("group.add(glassFront);", "group.add(glassFront);\n  addRoofDetails(group, width, depth, height);\n  addEntranceSteps(group, width, depth);")
    text = text.replace("group.add(roofPara);", "group.add(roofPara);\n  addRoofDetails(group, width, depth, height);")
    text = text.replace("group.add(lowerRoof);", "group.add(lowerRoof);\n  addRoofDetails(group, width * 0.5, depth * 0.5, 16);")

parking_logic = """
    /* Parking lots */
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.95 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    [[-120, -70, 40, 60], [120, 70, 40, 60], [0, 120, 90, 35]].forEach(([px, pz, pw, pl]) => {
      const pLot = new THREE.Mesh(new THREE.PlaneGeometry(pw, pl), asphaltMat);
      pLot.rotation.x = -Math.PI / 2;
      pLot.position.set(px, 0.05, pz);
      pLot.receiveShadow = true;
      scene.add(pLot);
      
      const numLines = Math.floor(pw/3.5);
      for(let i=0; i<numLines; i++) {
        const line1 = new THREE.Mesh(new THREE.PlaneGeometry(0.2, pl * 0.35), lineMat);
        line1.rotation.x = -Math.PI / 2;
        line1.position.set(px - pw/2 + 2 + i*3.5, 0.06, pz - pl * 0.25);
        scene.add(line1);
        
        const line2 = new THREE.Mesh(new THREE.PlaneGeometry(0.2, pl * 0.35), lineMat);
        line2.rotation.x = -Math.PI / 2;
        line2.position.set(px - pw/2 + 2 + i*3.5, 0.06, pz + pl * 0.25);
        scene.add(line2);
      }
    });

"""

if "Parking lots" not in text:
    text = text.replace("/* Pathways */", parking_logic + "/* Pathways */")

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("Details added to CampusVisualizer")
