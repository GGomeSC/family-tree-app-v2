# 🌳 GenealogyProof (iure sanguinis) Builder

A professional, local-first family tree builder designed specifically for companies managing citizenship processes (like *iure sanguinis*). This tool helps map ancestry evidence into clear, interactive visual structures required for judicial court submissions.

> **Privacy Focused**: No sign-in required. All data stays in your browser until you choose to export it.

---

## ✨ Key Features

- **Interactive Visual Canvas**: Drag, zoom, and organize family nodes with a high-performance interactive interface.
- **Automated Layout Engine**: Uses a background Web Worker to calculate complex ancestry structures instantly without freezing the UI.
- **Relationship Mapping**: Specialized logic for connecting parents, siblings, spouses, and children to prove bloodline descent.
- **Court-Ready Exports**: Export your entire tree as a high-resolution image, ready to be attached to legal dossiers or court petitions.
- **Local-First Persistence**: State is automatically saved to your browser's local storage—work offline and return whenever you want.

## 🛠️ Tech Stack

- **React 19 & TypeScript**: Type-safe, modern frontend architecture.
- **Vite**: Ultra-fast build tool and development server.
- **XYFlow (React Flow)**: Powering the interactive node-based canvas.
- **Zustand**: Lightweight, reactive state management.
- **Web Workers**: Offloading heavy layout calculations (Dagre) for a smooth 60fps experience.

## 🚀 Getting Started

### Development
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

### Production Build
To create a production version (e.g., for GitHub Pages):
```bash
npm run build
```

## 🌐 Deployment
This project is optimized for hosting on **GitHub Pages**. To deploy:
1. Ensure the `base` path is correctly set in `vite.config.ts` if needed.
2. Build the project and deploy the `dist` folder.

## ⚖️ License
This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)** - see the [LICENSE](LICENSE) file for details.
