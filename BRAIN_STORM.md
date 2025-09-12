# Game Editor Pages Specification

## Navigator
- [Main Page](#main-page)
  - [Toolbar](#toolbar)
    - [File](#file)
    - [Run / Play](#run--play)
  - [Resources Tab](#resources-tab)
    - [Sprites](#sprites)
    - [Objects](#objects)
    - [Rooms](#rooms)
    - [Sounds](#sounds)
    - [Scripts](#scripts)
    - [Functions](#functions)
- [Simulate Game / Run Game Page](#simulate-game--run-game-page)
    - [Panels](#panels)

---

## Main Page
At first load we want to either **create new project** or **load project**.  
For now, we focus on **new project**. This is shown as a modal or floating window.  

Upon load → go to **Main Page**.  
This page contains:

1. **Resources Tab** (sprites, sounds, objects, rooms, functions, scripts, etc.)  
2. **Toolbar** (for running game, creating new project, building project, etc.)  

---

## Toolbar

### File
Like in other software, the File menu provides a dropdown with:
1. New Project  
2. Open Project  
3. Save Project  

### Run / Play
- Runs the game by loading all resources into one object.  
- Saves data in **localStorage**.  
- Opens a new tab to test the game.  
- If not visited, data expires in 2 minutes.  
- When the tab/browser is closed, localStorage is cleaned to avoid bugs.  

---

## Resources Tab

### Sprites
- Right click → create **Sprite** or **Folder**.  
- Adding a folder → just creates folder.  
- Clicking **Sprite** → opens a file dialog to select PNG images.  
- After picking, images load into a **Sprite Grid Floating Window**.  

#### Sprite Grid Floating Window
**I. Properties Tab**
1. Origin  
0. Sprite name field  
1. Rows and columns  
2. Width and height  
3. Gap field  
4. Preview Window (looped animation)  
5. Speed (FPS playback)  

**II. Sprite Image Grid Panel**
- Grid boxes for selecting individual sprites  

**III. Actions**
1. Save → creates JSON with sprite info (`x, y, w, h` per box)  
2. Cancel → closes the floating window  

- Double-clicking a sprite reopens the grid window with saved data.  

---

### Objects
- Right click → add **Object** or **Folder**.  
- Adding Object → opens floating window.  

#### Object Window
**I. Properties**
1. Name  
2. Default Sprite (select from sprites)  
3. Collision Box (select sprites)  
4. Preview Window (plays sprite + collision hover)  

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
1. Save  
2. Cancel  
3. Close  

---

### Rooms
- Right click → add **Room** or **Folder**.  
- Adding Room → opens floating window.  

#### Room Window
**I. Properties**
1. Name  
2. Width  
3. Height  
4. Grid Size  
5. Layers (Dynamic)  
   - Add Layer Button  
   - Name Layer Item  
   - Remove Icon  
   - Rename Icon (label → input, readonly default)  
6. Selected Object (pick from objects folder)  
7. Camera (per room)  
   - Width (default 1080px)  
   - Height (default 720px)  
   - Following (none by default, select object)  
   - Panning Movement Speed  
   - Filter?  

**II. Room Panel**
1. Grid Area  
2. Camera Border  

---

### Sounds
- Right click → add **Sound** or **Folder**.  
- Supports `.ogg` and `.mp3`.  
- Files can be dropped in.  

---

### Scripts
- Scripts = multiple tasks (e.g., dialog system, global execution).  
- Right click → add **Script** or **Folder**.  

#### Script Editor
**I. Rich Code Editor with JavaScript Linting**
1. Save Script  
2. Load Script  
3. Export Script  
4. Close Button  

---

### Functions
- Functions = single task, can return values.  
- Examples: collision detection, logic operations.  

#### Function Editor
**I. Rich Code Editor with JavaScript Linting**
1. Save Script  
2. Load Script  
3. Export Script  
4. Close Button  

---

## Simulate Game / Run Game Page
Triggered when pressing **Run/Play** in the toolbar.  
- Loads saved data from **localStorage**.  
- Displays a loading screen.  
- Renders game via **Canvas**.  

---

### Panels
1. Canvas  
2. Side Panel → Console Debugging  
3. Bottom Panel → Debug Window  
4. Debug Overlay on Canvas (FPS, other stats)  
