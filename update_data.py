import re
with open(r"d:\3d\src\data\campusData.ts", "r", encoding="utf-8") as f:
    text = f.read()

text = re.sub(r"id:\s*'A',\n\s*name:\s*'.*?',\n\s*type:\s*'.*?',\n\s*position:\s*\{\s*x:\s*-?\d+,\s*y:\s*0,\s*z:\s*-?\d+\s*\}", 
              r"id: 'A',\n  name: 'Block A - Academic Building',\n  type: 'academic',\n  position: { x: -70, y: 0, z: 0 }", text, flags=re.DOTALL)
text = re.sub(r"id:\s*'B',\n\s*name:\s*'.*?',\n\s*type:\s*'.*?',\n\s*position:\s*\{\s*x:\s*-?\d+,\s*y:\s*0,\s*z:\s*-?\d+\s*\}", 
              r"id: 'B',\n  name: 'Block B - Main Building',\n  type: 'main',\n  position: { x: 0, y: 0, z: 0 }", text, flags=re.DOTALL)
text = re.sub(r"id:\s*'C',\n\s*name:\s*'.*?',\n\s*type:\s*'.*?',\n\s*position:\s*\{\s*x:\s*-?\d+,\s*y:\s*0,\s*z:\s*-?\d+\s*\}", 
              r"id: 'C',\n  name: 'Block C - Auditorium',\n  type: 'auditorium',\n  position: { x: 70, y: 0, z: 0 }", text, flags=re.DOTALL)

with open(r"d:\3d\src\data\campusData.ts", "w", encoding="utf-8") as f:
    f.write(text)