
# Vinyl Keeper

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Debian](https://img.shields.io/badge/Debian-D70A53?style=for-the-badge&logo=debian&logoColor=white)
![Raspberry Pi](https://img.shields.io/badge/-RaspberryPi-C51A4A?style=for-the-badge&logo=Raspberry-Pi)

**VinylKeeper** is a free and open-source application released under the Copyleft license.
<br>This is your go-to solution to effortlessly manage your vinyl collection, while fully respecting your privacy and data ownership.
<br><br> [VinylKeeper.org](https://vinylkeeper.org/)

<p align="center">
  <a href="https://vinylkeeper.org/">
    <img src="https://github.com/quentingenet/vinylkeeper/blob/develop/vinylkeeper_preview.webp" alt="VinylKeeper preview">
  </a>
</p>


##  Features and Upcoming / In Progress

📊 **Dashboard**  
Get a quick overview of your collection with insightful stats: genres, decades, top artists, and more.

📀 **Collections**  
Browse and manage your vinyl records, organized to your preferences.

➕ **Add Vinyls**  
Add new vinyls manually or search via Deezer integration.

🔍 **Explore**  
Discover artists and albums using a powerful search connected to the Deezer API.

🎯 **Suggestions**  
Smart recommendations based on your library and listening habits.

💖 **Wishlist**  
Keep track of the vinyls you’d love to add to your collection someday.

🔄 **Loans**  
Manage borrowed vinyls—know what you lent, to whom, and when.

⚙️ **Settings**  
Customize your profile, preferences, and account options.

🌍 **Interactive map**  
Discover & share vinyl places around the world with the community.

👥 **Community**  
See other users' collections, follow vinyl lovers, share discoveries and messages.

🔐 **Secure Authentication**  
JWT-based login, with refresh token handling via secure HTTPOnly cookies.

📱 **Responsive & PWA-ready**  
Fully responsive UI, optimized for desktop and mobile, with Capacitor support for Progressive Web App deployment.

🛠️ **Modern Architecture**  
React + TypeScript frontend (Vite), FastAPI backend (Python), PostgreSQL database. Rust & Java backend alternatives for learning and experimentation.

## Technologies

**VinylKeeper** is developed using:
- **[Python](https://www.python.org/)** with **[FastAPI](https://fastapi.tiangolo.com/)** for the main API.
- **[React](https://reactjs.org)** and **[TypeScript](https://www.typescriptlang.org/)** with **[Vite.js](https://vitejs.dev/)** for the frontend
- **[PostgreSQL](https://www.postgresql.org/)** for the database


## How to run the project? (API Python & FastAPI)

### Prerequisites

Ensure the following are installed on your machine:

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Vite.js](https://vitejs.dev/)
- [Python](https://www.python.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Poetry](https://python-poetry.org/)
- [Docker and Docker compose](https://docs.docker.com/)

### Clone the repository

```bash
git clone https://github.com/quentingenet/vinylkeeper.git
```
**⚠️ Don't forget to create your own `.env.development` file using the provided `.env.template.contributors` as a reference.**

### Backend Setup
Navigate to the backend folder, install dependencies, and run migrations:

```bash
cd vinylkeeper/vinylkeeper_back
poetry install
# Run database migrations
poetry run alembic upgrade head
# Start the server
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
The backend server runs at **http://localhost:8000**
- API documentation: **http://localhost:8000/docs**
- Alternative docs: **http://localhost:8000/redoc**

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
2. Create a feature branch **from develop** (`git checkout -b feat/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feat/amazing-feature`).
5. Open a Pull Request.

The project promotes the four essential freedoms:
1. Freedom to use the software.
2. Freedom to modify the software.
3. Freedom to share the software.
4. Freedom to share your modifications.

## Author and contributors

- Quentin GENET
- If you love vinyl, music, and web development, and are motivated to contribute seriously — we'd love to hear from you! 😄🚀
