# Discord Clone - Real-Time Chat Application

![App Screenshot](https://i.ibb.co/C5v6vqsC/screencapture-localhost-3000-2025-02-05-23-34-55.png)

## 🚀 Overview

Our **Discord Clone** is a powerful real-time chat application designed for seamless communication. It includes private messaging, community servers, live typing preview, avatar expressions, and robust moderation features—all powered by WebSockets for real-time updates.

## ✨ Features

### Display
- Responsive **on all devices**
- 2 themes (dark & white)

### 🔑 Authentication
- User **Registration, Login, and Password Reset**
- Secure authentication with JWT

### 💬 Private & Group Messaging
- **One-on-One Messaging** between users
- **Friend Requests** system for connections
- **Group Messaging** with dynamic user additions

### 🎭 Expressive Avatars
- Users can select **cartoon avatars**
- **Live Expression Updates**: Avatar changes based on user emotions

### 👀 No Hidden Thoughts
- **Real-time Typing Preview**: Others can see what a user is typing in real-time

### 🌍 Community Servers
- **Public servers** with **Rooms & Channels**
- **Role-based Access & Permissions**
- **Kick, Ban, and Delete** functionalities for moderation
- **Admin List & Permissions Control**

### 👤 User Profiles & Badges
- **Customizable User Profiles** with bio & avatars
- **Achievement Badges** for active users

### ⚡ Real-Time Updates
- **WebSocket-powered communication** for instant updates
- **Typing indicators, online status, and message sync**

---

## 📸 Screenshots

| Dashboard | Chat View | Server View | Contacts | Friend Requests | User Profile | Profile Settings |
|-----------|----------|-------------|----------|----------------|--------------|------------------|
| <img src="https://i.ibb.co/S7tWBFPm/screencapture-localhost-3000-2025-02-05-23-38-08.png" width="150"> | <img src="https://i.ibb.co/LDGW7sBz/screencapture-localhost-3000-2025-02-05-23-39-41.png" width="150"> | <img src="https://i.ibb.co/5dXnMNP/screencapture-localhost-3000-server-67a37baef5380581f4afd84c-2025-02-05-23-40-43.png" width="150"> | <img src="https://i.ibb.co/WNyjcvcM/screencapture-localhost-3000-2025-02-05-23-41-32.png" width="150"> | <img src="https://i.ibb.co/GQTFpthN/screencapture-localhost-3000-2025-02-05-23-43-05.png" width="150"> | <img src="https://i.ibb.co/j9wHY1X9/screencapture-localhost-3000-user-admin-2025-02-05-23-44-04.png" width="150"> | <img src="https://i.ibb.co/PGKq5V9B/screencapture-localhost-3000-2025-02-05-23-44-59.png" width="150"> |

---

## 🛠️ Installation

Clone the repository and install dependencies:

```sh
 git clone https://github.com/codeReturn/Discord-Clone.git
 cd discord-clone

 cd frontend
 npm install

 cd backend
 npm install
```

### 🎮 Run the App

```frontend
 npm run dev
```

```backend
 nodemon app
```

---

## 🔧 Configuration

Set up environment variables in `.env` file:

```env
DB = 'mongodb://localhost:27017/discord_clone'
SECRET = 'your_secret_key'
```

---

## Updating Links for Production Deployment

As part of deploying the application to production, it is essential to update all relevant URLs in both the backend and frontend to point to the correct production server. Below are the key updates required:

### 1. Update CORS Origin in `app.js` (Backend)
The CORS configuration in `app.js` currently allows requests from `localhost`. This needs to be updated to reflect the domain where the frontend is hosted.

- Locate the CORS middleware configuration in `app.js`.
- Update the `origin` property to the production frontend domain.

### 2. Update API Endpoints in the Frontend
The frontend currently references API endpoints using `http://localhost:5000/networkserver/`. All such occurrences must be replaced with the new production backend URL.

- Find and replace `http://localhost:5000/networkserver/` with `https://your-production-backend.com/networkserver/` in the frontend codebase.

### 3. Update WebSocket Server in Backend
In the backend WebSocket configuration, the server name (`networkserver`) needs to be updated.

- Locate the WebSocket setup file in the backend.
- Update any references to `networkserver` to align with the new production server configuration.

### 4. Update WebSocket Connection in `util/socket.js` (Frontend)
The frontend WebSocket connection is currently pointing to `http://localhost:5000`. This should be updated to the new production WebSocket server.

Final Steps
Verify that all links have been updated correctly.
Deploy the updated code to production.
Test the application to ensure smooth communication between frontend, backend, and WebSocket services.
By following these updates, th

## 🤝 Contributing

We welcome contributions! Follow these steps:

1. **Fork** the repository
2. **Create a feature branch** (`git checkout -b feature-name`)
3. **Commit changes** (`git commit -m "Added new feature"`)
4. **Push to branch** (`git push origin feature-name`)
5. **Submit a Pull Request**

---

## 📜 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 📞 Contact & Support

For any issues, feel free to **open an issue** or reach out to us at [info@san-company.com](info@san-company.com).

## Demo

https://polar.san-company.com
