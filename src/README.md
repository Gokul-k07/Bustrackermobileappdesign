# BusTracker - Live Bus Location System

## NextStop
**Role:** Frontend / Application Developer  
**Tech Stack:** React, Tailwind CSS, JavaScript, Supabase, OpenRouteService API, Maps API

- Developed a location-based travel and destination guidance platform for college bus tracking.
- Integrated real-time map and navigation features to show live bus positions and route progression efficiently.
- Designed a mobile-first, user-friendly interface focused on accessibility, role-based clarity, and real-time feedback.
- Structured content to support quick decision-making for passengers through distance/time calculations and AI assistance.

---

## 📝 Summary
BusTracker is a comprehensive mobile-first web application designed to bridge the gap between bus drivers and passengers. It provides real-time location transparency, enabling drivers to broadcast their routes and passengers to monitor bus arrivals, share their own locations via an OTP-based coin system, and interact with an AI-driven route assistant.

## 🚀 Implemented Features

### 🗺️ Real-time Map Integration
- **Live Tracking:** Real-time visualization of bus movements using high-accuracy geolocation.
- **Road Routing:** Actual road paths calculated via OpenRouteService API (no straight lines).
- **Dynamic UI:** Pulsing location icons, swipe-to-refresh map state, and automatic centering.

### 👥 Role-Based Dashboards
- **Driver (Admin):**
  - Go online/offline to start/stop broadcasting.
  - Generate 6-digit OTPs for passenger location sharing.
  - View a list of passengers currently sharing their location.
  - Manage and mark bus stops as "Passed" in real-time.
- **Passenger:**
  - View all active buses and their route progression.
  - Request location sharing with a driver using an OTP.
  - Manage a virtual coin balance (Earned by sharing location).

### 🤖 AI Chatbot Assistant
- Built-in assistant that understands natural language queries.
- Answers questions about bus routes (e.g., "Where does PSNA-30 go?").
- Provides app statistics (number of online/offline buses).
- Shares developer contact and support information.

### 💰 Coin & Reward System
- **Reward:** Drivers/Users earn 10 coins for sharing their live location.
- **Cost:** OTP-based location sharing validates the user's intent and manages system resources.

### 🔐 Authentication & Security
- Secure Email/Password authentication via Supabase.
- Email verification flow using dedicated notification services.
- Password reset system with 6-digit email verification codes.

---

## 📖 How to Use & Instructions

### For Drivers
1. **Sign Up/In:** Register as a 'Driver' during the onboarding flow.
2. **Start a Trip:** Go to the Home tab, click "Start Trip", and select your PSNA bus number.
3. **Broadcasting:** Once online, your location is shared. You will earn 10 coins instantly.
4. **Manage Passengers:** If a passenger wants to share their location with you, generate an OTP and give it to them.
5. **Update Route:** As you reach stops, click the stop buttons to mark them as "passed" for passengers to see.

### For Passengers
1. **Sign Up/In:** Register as a 'Passenger'.
2. **View Map:** Go to the Map tab to see all active college buses moving in real-time.
3. **Check Routes:** Click on any bus icon to see its full list of stops and current progress.
4. **Share Location:** If you are on a bus and want to help others track it, click "Share Location", enter the OTP provided by the driver, and select the bus. You will earn 10 coins.
5. **AI Help:** Use the Bot icon at the bottom right to ask questions like "How many buses are online?"

### General Instructions
- **Location Access:** Always allow location permissions when prompted by your browser for the app to function correctly.
- **Refreshing:** If the map feels stagnant, use the green refresh icon or "pull down" on the map to update the state.
- **Feedback:** Use the Profile tab to send feedback directly to the developer.

---
**Developer:** GOKUL K  
**Support:** gokulk24cb@psnacet.edu.in
