# Backend Notes: Indonesia Area Directory

Backend ini memakai `AreaDirectory` yang sudah ada untuk menyimpan direktori area administratif Indonesia dan mendukung:

- mobile picker area lewat `GET /meet-points/areas`
- nearest area lookup lewat `GET /areas/suggest-from-location`
- create-or-return-existing area lewat `POST /meet-points/areas`

## Inspect Summary

Struktur yang dipakai mengikuti pola repo yang sudah ada:

- Express bootstrap di `src/app/app.ts`
- route/controller/service di `src/modules/**`
- validation lewat `zod` + `validateRequest`
- response envelope lewat `successResponse(...)`
- Prisma model area yang diperluas adalah `AreaDirectory`, bukan model baru

## Prisma

Generate client:

```bash
npx prisma generate
```

Apply migration di local:

```bash
npx prisma migrate dev
```

Apply migration di staging/production:

```bash
npx prisma migrate deploy
```

Migration baru:

- `20260417193000_area_directory_location_support`
- `20260418090000_area_directory_value_and_bps_support`

## Seed dan Import

Seed local:

```bash
npx prisma db seed
```

Seed bawaan tetap mengisi sample area dan meet point supaya endpoint area tidak kosong di local.

Import BPS-style CSV sample:

```bash
npm run areas:import -- --file ./prisma/data/indonesia-bps-sample.csv
```

Dry run:

```bash
npm run areas:import -- --file ./prisma/data/indonesia-bps-sample.csv --dry-run
```

Generic import juga tetap didukung:

```bash
npm run areas:import -- --file ./path/to/areas.csv
npm run areas:import -- --file ./path/to/areas.json --format json
npm run areas:import -- --file ./path/to/areas.geojson --format geojson
```

### Expected BPS CSV format

Kolom yang direkomendasikan:

- `province_code`
- `province_name`
- `city_code`
- `city_name`
- `district_code`
- `district_name`
- `village_code`
- `village_name`
- `latitude`
- `longitude`

Untuk baris BPS level desa/kelurahan, importer akan otomatis membuat atau update hierarchy:

- `PROVINCE`
- `CITY`
- `DISTRICT`
- `VILLAGE`

Nilai yang diturunkan:

- `label = village_name` untuk row `VILLAGE`
- `value = village_name`
- `description = "{district_name}, {city_name}, {province_name}"`
- `adminCode = village_code`
- `provinceCode/cityCode/districtCode/villageCode` dari kode BPS
- `parentId` dibangun dari hierarchy code yang diimport

Jika dataset BPS awal tidak punya koordinat, importer tetap bisa jalan dan `latitude/longitude` akan `null`.

### Generic flat format

Masih didukung untuk file non-BPS:

- `adminCode`
- `label`
- `value`
- `level`
- `parentCode`
- `description`
- `latitude`
- `longitude`
- `countryCode`
- `isActive`

## Endpoints

### `GET /meet-points/areas?search=...`

Mengembalikan area options untuk mobile picker.

- search mencocokkan `label`, `normalizedLabel`, `description`, `adminCode`
- area aktif diprioritaskan dengan urutan `VILLAGE -> DISTRICT -> CITY -> PROVINCE -> OTHER`
- default limit hasil adalah 20 item

Alias publik:

- `GET /areas?search=...`

Contoh:

```bash
curl "http://localhost:4000/meet-points/areas?search=tebet"
```

### `POST /meet-points/areas`

Menyimpan area hasil current-location flow mobile.

Body:

```json
{
  "label": "Tebet Barat",
  "description": "Tebet, Kota Jakarta Selatan, DKI Jakarta",
  "level": "VILLAGE",
  "latitude": -6.2297,
  "longitude": 106.8494,
  "provinceCode": "31",
  "cityCode": "31.74",
  "districtCode": "31.74.06",
  "villageCode": "31.74.06.1001",
  "adminCode": "31.74.06.1001",
  "source": "DEVICE_LOCATION"
}
```

Dedup:

- return existing jika `adminCode` sudah ada
- return existing jika `normalizedLabel` sama dan koordinat cukup dekat
- create baru jika belum ada match

Alias publik:

- `POST /areas`

### `GET /areas/suggest-from-location?lat=...&lon=...&limit=...`

Mengembalikan nearest area berdasarkan koordinat.

- validasi `lat` range `-90..90`
- validasi `lon` range `-180..180`
- `limit` maksimal `20`
- prioritas ke `VILLAGE`
- fallback ke `SavedMeetPoint` jika direktori area tidak punya kandidat dekat
- jika data kosong atau tidak ada kandidat yang layak, hasilnya `primary: null`

Alias internal:

- `GET /meet-points/areas/suggest-from-location?...`

Contoh:

```bash
curl "http://localhost:4000/areas/suggest-from-location?lat=-6.2388&lon=106.9831&limit=5"
```

## Validation dan Index

Perubahan utama schema:

- `AreaDirectory` sekarang menyimpan `value`
- `adminCode` tetap unique
- `normalizedLabel` di-index dan tidak unique global
- index tambahan untuk `normalizedLabel + level` dan pasangan `latitude + longitude`
- enum `DirectoryEntrySource` mendukung `DEVICE_LOCATION`

## Reverse Proxy

Jika backend berjalan di belakang Nginx, Railway, Render, VPS reverse proxy, atau ingress lain yang mengirim header `X-Forwarded-For`, set:

```bash
TRUST_PROXY=1
```

Tanpa ini, `express-rate-limit` bisa melempar error `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`.

## Verification

Perintah yang sudah dijalankan:

```bash
npx prisma generate
npm run build
npm test
```

Jika ingin load data awal setelah merge:

```bash
npx prisma migrate deploy
npx prisma generate
npm run areas:import -- --file ./prisma/data/indonesia-bps-sample.csv
```
