# Backend Notes: Area Directory

Backend sekarang mendukung direktori area Indonesia untuk picker mobile, suggestion dari koordinat device, dan fallback create area saat belum ada area terdekat.

## Migration

Jalankan langkah ini setelah pull perubahan:

```bash
npx prisma migrate dev
npx prisma generate
```

Jika environment sudah punya data lain dan hanya butuh apply schema:

```bash
npx prisma migrate deploy
npx prisma generate
```

## Seed dan Import

Bootstrap cepat untuk local/dev:

```bash
npx prisma db seed
```

Seed bawaan mengisi beberapa area dan meet point sample supaya `GET /meet-points/areas` tidak kosong.

Untuk import direktori area dari file CSV atau GeoJSON:

```bash
npm run areas:import -- --file ./prisma/data/indonesia-areas.sample.csv
npm run areas:import -- --file ./path/to/areas.csv
npm run areas:import -- --file ./path/to/areas.geojson --format geojson
npm run areas:import -- --file ./path/to/areas.csv --dry-run
```

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
- `level` / `areaLevel` / `tingkat`
- `parentCode`
- `description`
- `latitude` / `lat`
- `longitude` / `lon` / `lng`

`source` import default adalah `OFFICIAL_IMPORT`. API create area menerima `USER_INPUT` atau `DEVICE_LOCATION`.

## Endpoints

### `GET /meet-points/areas?search=...`

Mengembalikan opsi area untuk mobile picker.

- Search mencocokkan `label`, `description`, dan `adminCode`
- Area aktif diprioritaskan dengan urutan `VILLAGE -> DISTRICT -> CITY -> PROVINCE -> OTHER`
- Response dibatasi 20 item

Alias publik yang setara:

- `GET /areas?search=...`

### `POST /meet-points/areas`

Menyimpan area fallback dari flow current location mobile.

Body:

```json
{
  "label": "Nama area",
  "description": "Opsional",
  "level": "VILLAGE",
  "latitude": -6.2,
  "longitude": 106.8,
  "provinceCode": "32",
  "cityCode": "32.75",
  "districtCode": "32.75.03",
  "villageCode": "32.75.03.1001",
  "adminCode": "32.75.03.1001",
  "source": "DEVICE_LOCATION"
}
```

Dedup behavior:

- jika `adminCode` sudah ada, backend mengembalikan record yang ada
- jika `normalizedLabel` sama dan koordinat berada di radius dekat, backend mengembalikan record yang ada
- jika tidak ada yang cocok, backend membuat area baru

Alias publik yang setara:

- `POST /areas`

### `GET /areas/suggest-from-location?lat=...&lon=...&limit=...`

Mengembalikan area terdekat dari koordinat device.

- validasi `lat` harus `-90..90`
- validasi `lon` harus `-180..180`
- `limit` maksimal 20
- suggestion memprioritaskan area `VILLAGE` yang masih cukup dekat
- jika area directory tidak punya match yang dekat, backend fallback ke `SavedMeetPoint`
- jika tetap tidak ada yang layak, response `primary: null` dan `suggestions: []`

Alias internal yang setara:

- `GET /meet-points/areas/suggest-from-location?lat=...&lon=...&limit=...`

## Validation dan Index

Perubahan schema:

- enum source area mendukung `DEVICE_LOCATION`
- `adminCode` tetap unique
- `normalizedLabel` tidak lagi unique global supaya nama area yang sama di wilayah berbeda bisa diimport
- index baru untuk `normalizedLabel`, `normalizedLabel + level`, dan pasangan `latitude + longitude`

## Reverse Proxy

Jika backend berjalan di belakang Nginx, Railway, Render, VPS reverse proxy, atau ingress lain yang mengirim header `X-Forwarded-For`, set:

```bash
TRUST_PROXY=1
```

Tanpa ini, `express-rate-limit` bisa melempar error `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`.

## Verification

Perintah yang sudah dijalankan:

```bash
npm run build
npm test
```
