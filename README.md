# 3D Game - Browser-Based FPS Movement

A simple 3D browser-based game built with JavaScript and Three.js, featuring smooth FPS-style movement controls.

## Features

- ✅ Smooth camera movement (WASD controls)
- ✅ Mouse look with pointer lock (no flicker)
- ✅ Camera-relative movement (movement matches where you're looking)
- ✅ Grid visualization for better spatial awareness
- ✅ Optimized for performance (60+ FPS)

## Tech Stack

- **Three.js** - 3D graphics library
- **Vite** - Fast build tool and dev server
- **JavaScript (ES6+)** - Modern JavaScript features

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/RagingScout97/3dGame.git
cd 3dGame
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to the URL shown (usually `http://localhost:5173`)

### Controls

- **Click** on the canvas to lock mouse pointer
- **W** - Move forward
- **S** - Move backward
- **A** - Strafe left
- **D** - Strafe right
- **Mouse** - Look around
- **ESC** - Unlock mouse pointer

## Project Structure

```
3dgame/
├── index.html      # HTML entry point
├── main.js         # Main game logic
├── package.json    # Dependencies
└── README.md       # This file
```

## Development

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## License

MIT License - see LICENSE file for details

## Author

Prakhar Singh Rajput
