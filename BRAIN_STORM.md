# Game Editor Specification

## 📌 Navigator
- [Resources Tab](#resources-tab)
  - [Sprites](#sprites)
  - [Objects](#objects)
  - [Rooms](#rooms)
  - [Sounds](#sounds)
  - [Scripts](#scripts)
  - [Functions](#functions)
- [Pages](#pages)

---

## Resources Tab
Like sprites, sounds, objects, rooms, functions, scripts, etc...

---

### Sprites
- Right click → create **Sprite** or **Folder**
- Adding a folder → just creates folder
- Clicking **Sprite** → opens a file dialog box
- After picking PNG images → loads into a **Sprite Grid Floating Window**

#### Sprite Grid Floating Window
**I. Properties Tab**
1. Origin  
0. Sprite name column field  
1. Rows and columns field  
2. Width and height field  
3. Gap field  
4. Preview Window (Looped animation preview)  
5. Speed (FPS for animation playback)  

**II. Sprite Image Grid Panel**
- Grids (boxes) to select individual sprites  

**III. Actions**
1. Save → creates JSON with sprite data (`x, y, w, h` per box)  
2. Cancel → closes the floating window  

- Double clicking sprite → reopens sprite grid floating window with saved data  

---

### Objects
- Right click → add **Object** or **Folder**
- Adding Object → opens a floating window  

#### Object Window
**I. Properties**
1. Name field  
2. Default Sprite (select from sprites)  
3. Collision Box (select sprites)  
4. Preview Window (plays default sprite with collision box hovered)  

**II. Sub Side Nav**
1. On Create Event  
2. On Update Event  
3. On Draw Event  
4. On Destroy Event  

**III. Rich Text Editor with JavaScript Linting**
1. Save Script  
2. Load Script  
3. Export Script  

**IV. Actions**
1. Save Button  
2. Cancel Button  
3. Close Button  

---

### Rooms
- Right click → add **Room** or **Folder**
- Adding Room → opens a floating window  

#### Room Window
**I. Properties**
1. Name  
2. Width  
3. Height  
4. Grid Size  
5. Layers (Dynamic)  
   - Add Layer Button  
   - Name Layer List Item  
   - Remove Icon  
   - Rename Icon (Label → Input, readonly by default)  
6. Selected Object (pick from existing objects)  
7. Camera (per room)  
   - Width (default `1080px`)  
   - Height (default `720px`)  
   - Following (default: none, can follow object)  
   - Panning Movement Speed  
   - Filter?  

**II. Room Panel**
1. Grid Area  
2. Camera Border  

---

### Sounds
- Right click → add **Sound** or **Folder**  
- Supports `.ogg` or `.mp3` files  
- Files can be dropped into the folder  

---

### Scripts
- Scripts = multiple tasks (e.g., story progression, dialog, global executions)  
- Right click → add **Script** or **Folder**

#### Script Editor
**I. Rich Code Editor with JavaScript Linting**
1. Save Script  
2. Load Script  
3. Export Script  
4. Close Button  

---

### Functions
- Functions = single task, can return a value  
- Examples: collision detection, logic helpers  

#### Function Editor
**I. Rich Code Editor with JavaScript Linting**
1. Save Script  
2. Load Script  
3. Export Script  
4. Close Button  

---

## Pages
*(Reserved section)*