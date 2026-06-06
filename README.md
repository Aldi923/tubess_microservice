# Travel Wisata Management System - Microservices Backend

Sistem ini adalah backend berbasis arsitektur microservices untuk mengelola data pariwisata (Travel Wisata). Terdiri dari 8 microservice independen dengan integrasi database MySQL dan containerization menggunakan Docker & Docker Compose.

## 🚀 Teknologi Stack
- **API Gateway**: Node.js, Express, `http-proxy-middleware`
- **Auth, User, Destination, Booking, Payment Services**: Node.js, Express, Sequelize ORM
- **Recommendation & Notification Services**: Python 3.12, FastAPI, SQLAlchemy
- **Database**: MySQL 8
- **Containerization**: Docker, Docker Compose

---

## 🏗️ Arsitektur Sistem

```
Postman (Client)
   │
   ▼
API Gateway (Port: 3000)
   │
   ├── [Auth Service] (Port: 3001)
   ├── [User Service] (Port: 3002)
   ├── [Destination Service] (Port: 3003)
   ├── [Booking Service] (Port: 3004) <---- (Mengambil harga destinasi dari Destination Service)
   ├── [Payment Service] (Port: 3005)
   ├── [Recommendation Service] (Port: 5001)
   └── [Notification Service] (Port: 5002)
```

Setiap endpoint diproteksi menggunakan **JWT Token Validation** pada level API Gateway.

---

## 📊 Entity Relationship Diagram (ERD)

Database: `travel_microservice`

1. **users**
   - `id` (INT, Primary Key, Auto Increment)
   - `name` (VARCHAR)
   - `email` (VARCHAR, Unique)
   - `password` (VARCHAR)
   - `createdAt` (DATETIME)
   - `updatedAt` (DATETIME)

2. **destinations**
   - `id` (INT, Primary Key, Auto Increment)
   - `name` (VARCHAR)
   - `city` (VARCHAR)
   - `price` (DECIMAL)
   - `description` (TEXT)
   - `image` (VARCHAR)
   - `createdAt` (DATETIME)
   - `updatedAt` (DATETIME)

3. **bookings**
   - `id` (INT, Primary Key, Auto Increment)
   - `userId` (INT, Foreign Key referencing `users.id`)
   - `destinationId` (INT, Foreign Key referencing `destinations.id`)
   - `totalPerson` (INT)
   - `totalPrice` (DECIMAL)
   - `createdAt` (DATETIME)
   - `updatedAt` (DATETIME)

4. **payments**
   - `id` (INT, Primary Key, Auto Increment)
   - `bookingId` (INT, Foreign Key referencing `bookings.id`)
   - `amount` (DECIMAL)
   - `status` (ENUM: 'PENDING', 'PAID', 'FAILED')
   - `createdAt` (DATETIME)
   - `updatedAt` (DATETIME)

---

## ⚙️ Cara Install & Menjalankan dengan Docker

Pastikan Docker & Docker Compose telah terinstal di komputer Anda.

1. Clone repository ini ke workspace lokal Anda.
2. Buka terminal pada root direktori project.
3. Jalankan perintah berikut untuk membuild dan menjalankan semua service secara paralel:

```bash
docker compose up --build
```

4. Docker akan mendownload base image, membangun container, dan membuat database secara otomatis beserta data seed awal (seed user & destinasi default).
5. Gateway akan terbuka pada port `3000`.

---

## 📮 Cara Testing dengan Postman

1. Import file `Postman_Collection.json` yang terletak pada root folder project ke dalam aplikasi Postman Anda.
2. Di dalam collection terdapat folder-folder request yang terstruktur rapi:
   - **Auth**: Registrasi, Login, dan Profil.
   - **Users**: Mendapatkan list user, update, dan delete user.
   - **Destinations**: CRUD destinasi wisata (Public endpoint `GET /destinations` tidak memerlukan token).
   - **Bookings**: Pembuatan booking (otomatis menghitung harga total dan menembak notifikasi).
   - **Payments**: Simulasi pembayaran (PENDING/PAID/FAILED).
   - **Recommendations**: Mendapatkan rekomendasi berdasarkan popularitas dan harga termahal.
   - **Notifications**: Kirim simulasi email (akan tercetak di logs container `travel-notification-service`).
3. Jalankan request **Login** terlebih dahulu. Response token akan secara otomatis disimpan ke variable collection Postman (`{{jwt_token}}`) berkat post-request script, sehingga Anda tidak perlu menyalin token secara manual untuk request lainnya.

---

## 📖 Dokumentasi API Swagger

Setiap service berbasis Express menyediakan Swagger UI untuk kebutuhan dokumentasi API interaktif:
- **Auth Service**: `http://localhost:3001/api-docs` (atau lewat Gateway: `http://localhost:3000/auth/api-docs`)
- **User Service**: `http://localhost:3002/api-docs` (atau lewat Gateway: `http://localhost:3000/users/api-docs`)
- **Destination Service**: `http://localhost:3003/api-docs` (atau lewat Gateway: `http://localhost:3000/destinations/api-docs`)
- **Booking Service**: `http://localhost:3004/api-docs` (atau lewat Gateway: `http://localhost:3000/bookings/api-docs`)
- **Payment Service**: `http://localhost:3005/api-docs` (atau lewat Gateway: `http://localhost:3000/payments/api-docs`)
# tubess_microservice
