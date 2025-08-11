const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class OSMGraphManager {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp/osm_graphs');
    this.ensureTempDirExists();
  }

  ensureTempDirExists() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  
    //Generate a filename for an OSM graph based on location
  generateGraphFilename(lat, lon, radius = 5000) {
    // Match Python backend logic: only use lat/lon, not radius
    const locationKey = `${lat.toFixed(4)}_${lon.toFixed(4)}`;
    const hash = crypto.createHash('md5').update(locationKey).digest('hex');
    return `osm_graph_${hash.substring(0, 8)}.graphml`; // Use first 8 chars to match Python backend
  }

    // Get the path for an OSM graph file
  getGraphPath(lat, lon, radius = 5000) {
    const filename = this.generateGraphFilename(lat, lon, radius);
    return path.join(this.tempDir, filename);
  }

    // Check if an OSM graph exists for the given location
  graphExists(lat, lon, radius = 5000) {
    const graphPath = this.getGraphPath(lat, lon, radius);
    return fs.existsSync(graphPath);
  }

    // Save an OSM graph to the temp directory
  saveGraph(lat, lon, graphData, radius = 5000) {
    const graphPath = this.getGraphPath(lat, lon, radius);
    fs.writeFileSync(graphPath, graphData);
    console.log(`💾 Saved OSM graph: ${path.basename(graphPath)}`);
  }

    // Load an existing OSM graph from the temp directory
  loadGraph(lat, lon, radius = 5000) {
    const graphPath = this.getGraphPath(lat, lon, radius);
    if (this.graphExists(lat, lon, radius)) {
      console.log(`📁 Loading cached OSM graph: ${path.basename(graphPath)}`);
      return fs.readFileSync(graphPath, 'utf8');
    }
    return null;
  }

    // Get all cached graph files with their metadata
  getCachedGraphs() {
    if (!fs.existsSync(this.tempDir)) {
      return [];
    }

    return fs.readdirSync(this.tempDir)
      .filter(file => file.endsWith('.graphml'))
      .map(file => {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      });
  }

    // Clean up old graph files (older than 24 hours)
  cleanupOldGraphs(maxAgeHours = 24) {
    const graphs = this.getCachedGraphs();
    let removedCount = 0;

    graphs.forEach(graph => {
      const ageInHours = (Date.now() - graph.modified.getTime()) / (1000 * 60 * 60);
      if (ageInHours > maxAgeHours) {
        fs.unlinkSync(graph.path);
        removedCount++;
        console.log(`Removed old OSM graph: ${graph.filename}`);
      }
    });

    return removedCount;
  }
}

module.exports = OSMGraphManager;
