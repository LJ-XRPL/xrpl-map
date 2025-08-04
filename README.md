# XRPL Infrastructure Dashboard

A real-time visualization dashboard for XRPL (XRP Ledger) infrastructure, showcasing Real World Assets (RWAs) and Stablecoins with their geographic distribution on an interactive globe.

![XRPL Infrastructure Dashboard](https://img.shields.io/badge/React-18.x-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Deployment](https://img.shields.io/badge/deployment-ready-brightgreen)

## 🌟 Features

- **Interactive 3D Globe**: Powered by react-globe.gl with real-time rotation and zoom
- **Geographic Mapping**: Visual representation of RWA and Stablecoin issuers by city
- **Real World Assets Tracking**: Left sidebar displays RWAs categorized by geographic region
- **Stablecoin Monitoring**: Right sidebar shows stablecoins with issuer information
- **Responsive Design**: Modern, dark theme with full responsive layout
- **XRPL Integration Ready**: Structured for easy integration with live XRPL data feeds

## 🚀 Live Demo

[View Live Demo](https://your-deployment-url.vercel.app) *(Replace with actual deployment URL)*

## 📱 Screenshots

### Desktop View
The dashboard displays a full 3D interactive globe with RWA and Stablecoin data in the sidebars.

### Mobile Responsive
Fully responsive design that works seamlessly across all device sizes.

## 🛠️ Technology Stack

- **Frontend**: React 18.x
- **3D Visualization**: react-globe.gl, Three.js
- **Styling**: CSS3 with modern design patterns
- **Data**: TopoJSON for geographic data
- **Build Tool**: Create React App
- **Deployment**: Vercel/Netlify ready

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/xrpl-infra.git
   cd xrpl-infra
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🏗️ Project Structure

```
xrpl-infra/
├── public/
│   ├── index.html          # Main HTML template
│   └── ...
├── src/
│   ├── components/
│   │   ├── Globe.jsx       # Interactive 3D globe component
│   │   ├── Sidebar.jsx     # RWA data display
│   │   └── Stablecoins.jsx # Stablecoin data display
│   ├── data/
│   │   ├── rwas.js         # Real World Assets data
│   │   └── stablecoins.js  # Stablecoin data
│   ├── App.jsx             # Main application component
│   ├── App.css             # Global styles
│   └── index.js            # Application entry point
├── package.json
└── README.md
```

## 🎨 Customization

### Adding New Assets

1. **Real World Assets**: Edit `src/data/rwas.js`
   ```javascript
   {
     "name": "Your Asset Name",
     "issuer": "rYOUR...",
     "currency": "USD",
     "amount": 1000000,
     "city": "New York",
     "lat": 40.7128,
     "lng": -74.0060
   }
   ```

2. **Stablecoins**: Edit `src/data/stablecoins.js`
   ```javascript
   {
     "name": "Your Stablecoin",
     "issuer": "rYOUR...",
     "currency": "USD",
     "amount": 5000000,
     "city": "London",
     "lat": 51.5074,
     "lng": -0.1278
   }
   ```

### Styling Customization

The project uses a modern dark theme. Main styling can be customized in `src/App.css`:

- **Colors**: Update CSS custom properties for consistent theming
- **Globe**: Modify globe properties in `src/components/Globe.jsx`
- **Layout**: Adjust sidebar widths and responsive breakpoints

## 🚀 Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

### Netlify

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy the `build` folder** to Netlify

### GitHub Pages

1. **Install gh-pages**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Add to package.json**
   ```json
   "homepage": "https://yourusername.github.io/xrpl-infra",
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d build"
   }
   ```

3. **Deploy**
   ```bash
   npm run deploy
   ```

## 🔗 XRPL Integration

This dashboard is designed to easily integrate with live XRPL data. To connect to real XRPL networks:

1. **Install XRPL.js**
   ```bash
   npm install xrpl
   ```

2. **Replace static data** in `src/data/` with API calls to XRPL nodes
3. **Add real-time updates** using WebSocket connections
4. **Implement data refresh** mechanisms for live monitoring

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [react-globe.gl](https://github.com/vasturiano/react-globe.gl) for the amazing 3D globe component
- [XRPL Foundation](https://xrpl.org/) for the XRP Ledger ecosystem
- [Natural Earth](https://www.naturalearthdata.com/) for geographic data
- [TopoJSON](https://github.com/topojson/topojson) for efficient geographic data encoding

## 📞 Support

- **Documentation**: [Wiki](https://github.com/yourusername/xrpl-infra/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/xrpl-infra/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/xrpl-infra/discussions)

## 🗺️ Roadmap

- [ ] Live XRPL data integration
- [ ] Real-time WebSocket updates
- [ ] Additional visualization modes
- [ ] Mobile app version
- [ ] API endpoint for data access
- [ ] Advanced filtering and search
- [ ] Historical data tracking
- [ ] Multi-language support

---

**Built with ❤️ for the XRPL community**
