# Import Area Nasional

Script importer area ada di:
- `npm run areas:import -- --file ./path/to/areas.csv`
- `npm run areas:import -- --file ./path/to/areas.geojson --format geojson`
- `npm run areas:import -- --file ./path/to/areas.csv --dry-run`

Kolom CSV yang didukung:
- `adminCode`
- `label`
- `level`
- `parentCode`
- `description`
- `latitude`
- `longitude`
- `countryCode`
- `isActive`

Properti GeoJSON yang didukung:
- `adminCode` / `admin_code` / `kode_wilayah`
- `label` / `name` / `nama`
- `level`
- `parentCode`
- `description`
- `latitude` / `lat`
- `longitude` / `lon` / `lng`

Endpoint suggestion area dari lokasi:
- `GET /areas/suggest-from-location?lat=-6.23&lon=106.98`
- alias internal juga tersedia di `GET /meet-points/areas/suggest-from-location?...`
