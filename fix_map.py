with open('frontend/src/components/MapLibre3D.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

target = "const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';"
replacement = '''const LIGHT_STYLE = {
  version: 8,
  sources: {
    'osm': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap Contributors'
    }
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};'''

c = c.replace(target, replacement)

with open('frontend/src/components/MapLibre3D.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Success')

