# Barengin Backend MVP

Backend MVP untuk aplikasi Barengin, yaitu platform pencarian teman searah untuk pulang bareng atau konvoi singkat dengan fokus keamanan dasar.

## Stack

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- Zod
- JWT
- dotenv
- cors
- helmet
- morgan
- express-rate-limit

## Fitur MVP

- Auth OTP mock
- Profil user
- Buat dan kelola trip
- Cari kandidat trip searah
- Ajukan, accept, reject match
- Mulai dan selesaikan convoy session
- Meet point publik mock
- Guardian contact
- Report
- Rating dan ringkasan rating user

## Struktur Folder

```txt
backend/
  src/
    app/
    config/
    common/
    modules/
      auth/
      users/
      trips/
      matching/
      meet-points/
      guardians/
      reports/
      ratings/
    prisma/
  prisma/
    schema.prisma
    seed.ts
  package.json
  tsconfig.json
  .env.example
  README.md
```

## Setup Lokal

1. Install dependency

```bash
npm install
```

2. Copy environment file

```bash
cp .env.example .env
```

3. Sesuaikan `DATABASE_URL`, `JWT_SECRET`, dan `PORT` pada `.env`

4. Generate Prisma Client

```bash
npm run prisma:generate
```

5. Jalankan migrasi

```bash
npm run prisma:migrate -- --name init
```

6. Seed data

```bash
npm run prisma:seed
```

7. Jalankan development server

```bash
npm run dev
```

Server default berjalan di `http://localhost:4000`.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:seed`

## Auth Flow

### Request OTP

`POST /auth/request-otp`

```json
{
  "phoneNumber": "081234567890"
}
```

### Verify OTP

`POST /auth/verify-otp`

```json
{
  "phoneNumber": "081234567890",
  "code": "123456"
}
```

Response akan mengembalikan `accessToken` dan data user.

Gunakan header:

```txt
Authorization: Bearer <accessToken>
```

## Daftar Endpoint

### Auth

- `POST /auth/request-otp`
- `POST /auth/verify-otp`

### Users

- `GET /users/me`
- `PATCH /users/me`
- `GET /users/:userId/rating-summary`

### Trips

- `POST /trips`
- `GET /trips/active`
- `GET /trips/my`
- `PATCH /trips/:tripId/end`
- `PATCH /trips/:tripId/cancel`

### Matching

- `GET /matching/candidates/:tripId`
- `POST /matching/request`
- `PATCH /matching/:matchId/accept`
- `PATCH /matching/:matchId/reject`
- `GET /matching/:matchId`
- `PATCH /matching/:matchId/start`
- `PATCH /matching/:matchId/complete`

### Meet Points

- `GET /meet-points`
- `GET /meet-points/recommendations?area=Bekasi%20Timur`

### Guardians

- `POST /guardians`
- `GET /guardians/:tripId`

### Reports

- `POST /reports`

### Ratings

- `POST /ratings`

## Response Format

### Success

```json
{
  "success": true,
  "message": "string",
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "message": "string",
  "errors": {}
}
```

## Seed Data

Seed akan membuat:

- 5 user dummy
- 4 trip aktif
- 1 skenario convoy selesai
- 2 rating dummy
- 1 guardian contact dummy

## MVP Limitations

- OTP masih mock dan selalu memakai kode `123456`
- Meet point masih hardcoded, belum terintegrasi maps/geolocation
- Belum ada refresh token
- Belum ada upload dokumen verifikasi
- Matching masih rule-based sederhana, belum memakai koordinat real-time
- Belum ada share tracking guardian yang real
- Belum ada background jobs atau notification service
