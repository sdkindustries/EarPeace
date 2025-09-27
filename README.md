# EarPeace - Tinnitus Therapy Mobile App

A comprehensive cross-platform mobile application for tinnitus therapy, built with Expo, React Native, FastAPI, and MongoDB.

## 🎯 Features

### Audio Therapy Tools
- **Noise Generation**: White, pink, brown, gray, and blue noise
- **Frequency Playback**: Play specific frequencies (10Hz-25kHz)
- **Burst Mode**: Frequency bursting with customizable duration and intervals ✅
- **Random Burst**: Random frequency bursting within defined ranges
- **Notch Filtering**: Filter specific frequencies from color noises
- **Frequency Finder**: Interactive tool to help identify tinnitus frequencies

### App Features
- **Timer Functionality**: Set duration timers for therapy sessions
- **Playlist Management**: Save and load custom audio configurations
- **Independent Controls**: Each audio feature works independently
- **Real-time Audio**: Generated audio with expo-av integration
- **Responsive UI**: Dark theme with mobile-optimized interface

## 🏗️ Architecture

### Frontend (Expo/React Native)
- **Framework**: Expo with React Native
- **Navigation**: Expo Router with file-based routing
- **Audio**: expo-av for cross-platform audio generation
- **UI Components**: Native React Native components
- **State Management**: React hooks

### Backend (FastAPI)
- **Framework**: FastAPI (Python)
- **Database**: MongoDB with motor driver
- **API**: RESTful endpoints for audio settings
- **CORS**: Configured for cross-origin requests

### Database (MongoDB)
- **Collections**: audio_settings, tinnitus_frequencies
- **Models**: Pydantic models for data validation
- **Operations**: Full CRUD support

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or later)
- Python (v3.8 or later)
- MongoDB
- Expo CLI (`npm install -g @expo/cli`)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/EarPeace.git
   cd EarPeace
   ```

2. **Set up the Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   python server.py
   ```

3. **Set up the Frontend**
   ```bash
   cd frontend
   yarn install
   expo start
   ```

4. **MongoDB Setup**
   - Ensure MongoDB is running locally
   - Default connection: `mongodb://localhost:27017/tinnitus_therapy`

## 📱 Usage

### Web Preview
- Access the web version at `http://localhost:3000`
- Full functionality available in browser

### Mobile Testing
- Use Expo Go app to scan QR code
- Test on iOS/Android devices
- Full audio functionality on mobile devices

### Burst Mode (Recently Fixed ✅)
- Enable burst mode in the Burst tab
- Set frequency, duration, and interval
- Works independently from other audio sources
- Proper start/stop/restart functionality

## 🛠️ Development

### Project Structure
```
EarPeace/
├── frontend/           # Expo/React Native app
│   ├── app/           # File-based routing
│   │   ├── index.tsx  # Main therapy interface
│   │   ├── frequency-finder.tsx
│   │   └── playlists.tsx
│   └── package.json
├── backend/           # FastAPI server
│   ├── server.py      # Main server file
│   └── requirements.txt
└── README.md
```

### Key Technologies
- **Frontend**: Expo 52, React Native, TypeScript
- **Backend**: FastAPI, Pydantic, Motor
- **Database**: MongoDB
- **Audio**: expo-av, Web Audio API

## 🎵 Audio Features

### Noise Types
- **White Noise**: Equal energy across all frequencies
- **Pink Noise**: Energy inversely proportional to frequency
- **Brown Noise**: Energy inversely proportional to frequency squared
- **Gray Noise**: Psychoacoustically equal loudness
- **Blue Noise**: Energy proportional to frequency

### Burst Mode
- **Fixed Frequency**: Burst specific frequencies
- **Random Range**: Burst random frequencies within range
- **Customizable**: Duration (100-5000ms), Interval (500-10000ms)
- **Independent**: Works separately from other audio sources

## 🧪 Testing

### Backend Testing
- All CRUD operations tested ✅
- MongoDB integration verified ✅
- API endpoints working correctly ✅

### Frontend Testing
- Audio generation functional ✅
- Burst mode fixed and working ✅
- UI responsive and accessible ✅
- Cross-platform compatibility ✅

## 📋 API Endpoints

### Audio Settings
- `GET /api/audio-settings` - Get all settings
- `POST /api/audio-settings` - Create new setting
- `GET /api/audio-settings/{id}` - Get specific setting
- `PUT /api/audio-settings/{id}` - Update setting
- `DELETE /api/audio-settings/{id}` - Delete setting

### Tinnitus Frequencies
- `GET /api/tinnitus-frequency` - Get all frequencies
- `POST /api/tinnitus-frequency` - Create new frequency
- `DELETE /api/tinnitus-frequency/{id}` - Delete frequency

## 🚧 Roadmap

- [ ] Implement notch filtering
- [ ] Add random frequency burst
- [ ] Enhanced playlist management
- [ ] User profile system
- [ ] Advanced timer features
- [ ] Audio session recording
- [ ] Treatment progress tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**EarPeace** - Bringing peace to your ears through technology 🎧✨
