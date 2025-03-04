
# Vinyl Keeper

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=orange)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Debian](https://img.shields.io/badge/Debian-D70A53?style=for-the-badge&logo=debian&logoColor=white)
![Raspberry Pi](https://img.shields.io/badge/-RaspberryPi-C51A4A?style=for-the-badge&logo=Raspberry-Pi)

**VinylKeeper** is a free and open-source application released under the Copyleft license.
<br>Vinyl Keeper is your go-to solution for effortlessly managing your vinyl collection while respecting your data and privacy.
<br><br>Coming soon on [VinylKeeper here!](https://vinylkeeper.org/)

<p align="center">
  <a href="https://vinylkeeper.org/">
    <img src="https://github.com/quentingenet/vinylkeeper/blob/develop/vinylkeeper_preview.webp" alt="VinylKeeper preview">
  </a>
</p>


## Technologies

**VinylKeeper** is developed using:
- **[Python](https://www.python.org/)** with **[FastAPI](https://fastapi.tiangolo.com/)** for the main API.
- **[Rust](https://www.rust-lang.org)** with **[Rocket](https://rocket.rs)** also for another version of the API.
- **[React](https://reactjs.org)** and **[TypeScript](https://www.typescriptlang.org/)** for the frontend
- **[PostgreSQL](https://www.postgresql.org/)** for the database


## How to run the project?

### Prerequisites

Ensure the following are installed on your machine:

- [Rust](https://www.rust-lang.org)
- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Python](https://www.python.org/)
- [FastAPI](https://fastapi.tiangolo.com/)

### Clone the repository

```bash
git clone https://github.com/quentingenet/vinylkeeper.git
```
**Don't forget to create your personal .env.development file for the environment variables used in the project (front and back), to do that you can use the .env.template.contributors file**

### Backend Setup
Navigate to the backend folder, install dependencies, and run migrations:

```bash
cd vinylkeeper/vinylkeeper_back
cargo build
# (Optional) If using Diesel migrations
diesel migration run
cargo run
```
or if you want to run the backend with FastAPI(poetry):
```bash
cd vinylkeeper/vinylkeeper_back
poetry install
# make migrations
poetry alembic upgrade head
# run the server
poetry run uvicorn app.main:app --reload
```
The backend server runs at **http://localhost:8000**

### Frontend Setup
In a separate terminal, navigate to the frontend folder, install dependencies, and start the server:

```bash
cd vinylkeeper/vinylkeeper_front
npm install
npm run dev
```
Visit **http://localhost:5173** in your browser to access the VinylKeeper application.

## How to contribute?

We welcome contributions to improve Vinyl Keeper! To contribute:

1. Fork this repository.
2. Create a feature branch **from develop** (`git checkout -b features/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin features/AmazingFeature`).
5. Open a Pull Request.

The project promotes the four essential freedoms:
1. Freedom to use the software.
2. Freedom to modify the software.
3. Freedom to share the software.
4. Freedom to share your modifications.

## Author and contributors

- Quentin GENET
- You like vinyl, music and web development and is motivated to contribute seriously ? Maybe you can contribute ?  😄🚀
