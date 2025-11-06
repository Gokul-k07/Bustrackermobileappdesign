# BusTracker - Complete Application Specification

Build a mobile-first web application called **BusTracker** that enables real-time location tracking between bus drivers and passengers with an OTP-based coin system.

---

## **Core Concept**

Create a dual-interface application where:
- **Drivers (Admins)** share live bus locations with passengers and can generate OTPs for passenger location sharing
- **Passengers (Users)** view live bus locations and can share their own location back with drivers using OTP verification (costs 10 coins per share, valid for 5 hours)

---

## **User Roles & Authentication**

### **Role-Based System**
- Two distinct roles: **Driver** and **Passenger**
- Users select their role during onboarding
- Each role has unique permissions and interfaces
- Color-coded UI for role distinction (drivers: blue/primary, passengers: green/secondary)

### **Authentication Features**
- Complete onboarding flow with role selection
- Sign up with name, email, password, and role
- Sign in for returning users
- **Password reset functionality** with verification code system:
  - Send 6-digit verification code to email
  - Verify code and reset password
  - Code expires after 5 minutes
  - "Forgot Password" option on login screen
- Email confirmation automatically enabled (no email server required)
- Session persistence across page refreshes
- Secure token-based authentication using Supabase Auth

### **Initial Coin Balance**
- Passengers start with 50 coins
- Drivers start with 0 coins

---

## **Driver Features**

### **Online/Offline Status**
- Toggle between online and offline states
- When going online, select bus from predefined list
- Location automatically shared when online
- **Error handling**: Show error if selected bus is already being shared by another driver
- Drivers can only go online with buses not currently in use
- Real-time location updates every second while online

### **OTP Generation System**
- Generate 6-digit OTPs for passengers
- OTPs valid for 5 hours
- Display active OTPs with expiration times
- Driver can manually stop/revoke OTPs
- When OTP is stopped, all passengers using that OTP have their sharing stopped
- Copy OTP to clipboard functionality

### **Passenger Location Monitoring**
- View all passengers sharing locations using driver's OTPs
- See passenger names and real-time positions
- **Passenger locations displayed as bus icons** on map (not separate user markers)
- Driver can stop individual passenger sharing sessions
- Real-time updates every second

### **Bus Route Management**
- **Edit bus stops and routes** while online
- Add new stops with name, latitude, and longitude coordinates
- Remove existing stops
- Reorder stops by dragging or manual ordering
- Mark stops as "passed" during the trip
- **Save custom routes** that persist for future trips
- Default routes provided for PSNACET buses

### **Trip Tracking**
- Limit: 5 trips per day maximum
- Track trip history with start/end times
- Display trip statistics on profile

---

## **Passenger Features**

### **Live Bus Tracking**
- View all online buses in real-time
- See bus names, driver names, and last update times
- Click bus to view detailed route and stops
- Map shows current bus positions with live updates
- Buses update every second for real-time accuracy

### **Location Sharing System**
- Enter driver-provided 6-digit OTP
- Select bus name from available buses
- Costs 10 coins per sharing session
- Sharing valid for 5 hours from start time
- **Auto-stops after 5 hours** with notification
- Real-time location updates sent every second while sharing
- **Display as bus icon** on map when sharing (passenger acts as temporary driver)
- Can manually stop sharing anytime
- State persists across page refreshes

### **Bus Route Viewing**
- Click any bus to see complete route
- View all stops with "passed" status indicators
- See estimated time and route progression
- Real-time updates of passed stops

### **Coin Management**
- Display current coin balance in header
- Purchase coin packages (10, 50, 100 coins)
- **Mock payment system** for demonstration (instant purchase)
- Cannot share location without sufficient coins (10 required)
- Transaction history on profile page

---

## **Map Integration**

### **Google Maps with Aerial View**
- Use **Google Maps API with aerial/satellite view** (not standard satellite)
- Responsive map that fills screen
- Real-time marker updates without page refresh

### **Map Markers**
- **Bus markers**: Blue bus icons for drivers
- **Passenger sharing markers**: Display as bus icons (not user icons)
- **User location marker**: Green pin for current user position
- **Bus stop markers**: Numbered circles showing route progression
- **Passed stops**: Checkmark indicator
- **Future stops**: Empty circle indicator

### **Map Controls**
- Zoom in/out buttons
- Reset to current location
- Click markers for detailed information
- Smooth animations for marker movements
- Clustering for multiple nearby markers

### **Interactive Features**
- Click bus icon to show:
  - Driver name
  - Bus route name
  - All bus stops in order
  - Route progression (which stops are passed)
  - Last update time
  - Real-time speed and direction (if available)
- Route visualization with polylines connecting stops
- Auto-center on selected bus
- Show distance from user to selected bus

---

## **Bus Management System**

### **Predefined PSNACET Buses**
- Complete list of college buses with updated numbers
- Bus name format: `PSNA-30`, `PSNA-29`, `PSNA-31/56`, `PSNA-36`, `PSNA-35`, `PSNA-32`, `PSNA-69`, `PSNA-73`, `PSNA-72`, `PSNA-74`, `PSNA-20`, `PSNA-23/22`, `PSNA-28`, `PSNA-25`, `PSNA-26`, `PSNA-27`, `PSNA-45`, `PSNA-47`, `PSNA-38`, `PSNA-51`, `PSNA-34`, `PSNA-33/39`, `PSNA-53`, `PSNA-54`, `PSNA-44`, `PSNA-40`, `PSNA-59`, `PSNA-42`, `PSNA-43`, `PSNA-46`, `PSNA-57`, `PSNA-48`, `PSNA-49`, `PSNA-52`, `PSNA-41`, `PSNA-55`, `PSNA-50`, `PSNA-58`, `PSNA-60`, `PSNA-61`

### **Default Routes**
Provide predefined routes for major buses:

- **PSNA-30**: MURUGABHAVANAM → AYYANGULAM → SAKTHI TALKIES → AARIYABHAVAN → VANI VILAS → JEGANATH HOSPITAL → SONA TOWER → AMMA MESS → 12TH CROSS → 9TH CROSS → 8TH CROSS → 7TH CROSS → WATER TANK → 4TH CROSS → MVM COLLEGE → ANJALI BYE PASS → PSNACET

- **PSNA-29**: BALAKRISHNAPURAM → SMBM SCHOOL → SP OFFICE → DGL SCAN → DGL BUS STAND → DGL G.H → AARIYABHAVAN → PALANI BYE.PASS → PSNACET

- **PSNA-31/56**: KULLANAMPATTY → II RMTC → VIJAY THEATRE → NAGAL NAGAR → ANNAMALAYAR SCHOOL → BHARATH!PURAM → BHUVANESWARI AMMAN KOVIL → METTUPATTY → BEGAMBUR → PARAPATTI K → A.P NAGAR → PSNACET

- **PSNA-36**: CHINNALAPATTY → POONCHOLAI → CHINNALAPATTY PIRIVU → KEELAKOTTAI BYE-PASS → CHETTIYAPATTY PIRIVU → KALIKAM PATTY PIRIVU → POKUVARATHU NAGAR → VELLODU PIRIVU → PANJAM PATTY PIRIVU (EAST) → COFFEE SHOP → ANNAMALAYAR MILL → THOMAYARPURAM → PSNACET

(Include all other bus routes similarly)

### **Bus Selection Features**
- Drivers select bus when going online
- Passengers select bus when starting location sharing
- **Error validation**: Show error message if bus is already in use
- **Only drivers can add new buses** to the system
- Passengers can only select from existing buses
- Bus availability status shown in real-time

### **Adding New Buses (Driver Only)**
- Button to add new bus in driver dashboard
- Dialog with input for new bus name
- Validate format matches `PSNA-XX` pattern
- Add to available buses list
- Immediately available for selection

---

## **Location System**

### **Location Permission Handling**
- Request geolocation permission on app load
- **Clear user notifications** for permission states:
  - Toast notification asking for permission
  - Success message when granted
  - Error messages for different denial scenarios
  - Warning for browser restrictions
  - Info message for unsupported browsers
- Default location: PSNACET campus (10.3673, 77.9738) - Tamil Nadu, India
- **Detailed error messages** for different permission states:
  - Permission denied
  - Position unavailable
  - Timeout errors
  - Permissions policy restrictions

### **Real-Time Updates**
- Location updates every second (1000ms interval)
- Use `watchPosition` for continuous tracking
- Background updates even when app is minimized
- **High accuracy mode** enabled
- Updates sent to backend every second
- Display real-time on map for all users

### **Location Sharing Rules**
- **Passengers**: Location shared only when actively sharing (OTP verified)
- **Drivers**: Location shared only when online
- **Shared passengers act as temporary drivers**: Their locations appear as bus icons
- Location permission must be granted for sharing
- Clear notifications when sharing starts/stops
- Auto-stop after 5 hours with notification

---

## **Notifications & Feedback**

### **Toast Notifications**
- Use Sonner toast library
- Success messages (green)
- Error messages (red)
- Info messages (blue)
- Warning messages (yellow)
- Loading states for async operations

### **Comprehensive Error Messages**
- Authentication errors (invalid credentials, email already exists)
- Location permission errors (denied, unavailable, timeout)
- OTP errors (invalid, expired)
- Bus errors (already in use, not found)
- Coin errors (insufficient balance)
- Network errors (backend failure, timeout)
- Validation errors (empty fields, invalid format)

### **Action Feedback**
- Button loading states during operations
- Disabled states for invalid actions
- Confirmation dialogs for destructive actions
- Success confirmations for completed actions
- Real-time status indicators (online/offline, sharing/not sharing)

### **Feedback System**
- **Feedback button on profile page**
- Dialog with feedback type selector:
  - Bug Report
  - Feature Request
  - General Feedback
  - Complaint
  - Appreciation
- Text area for detailed message
- Send feedback to email: **gokulk24cb@psnacet.edu.in**
- Opens email client with pre-filled subject and body
- Includes user details (name, email, role, timestamp)
- Success notification after sending

---

## **UI/UX Requirements**

### **Mobile-First Design**
- Optimized for mobile devices (320px - 768px)
- Maximum width: 448px (centered on desktop)
- Touch-friendly button sizes (minimum 44x44px)
- Responsive typography
- Mobile-optimized forms and inputs

### **Navigation**
- Bottom tab bar with 3 tabs:
  - **Home**: Main dashboard (different for driver/passenger)
  - **Map**: Live map view
  - **Profile**: User settings and information
- Active tab highlighted
- Icons from lucide-react

### **Header**
- App name with bus icon
- Current coin balance badge
- Role and status badge (Online/Offline for drivers, Passenger for passengers)
- Sticky header while scrolling

### **Color System**
- Primary (blue): Driver-related elements
- Green: Passenger-related elements
- Red: Errors and destructive actions
- Yellow: Warnings
- Gray: Neutral elements
- Use Tailwind CSS for consistent design

### **Cards & Components**
- Use shadcn/ui components throughout
- Cards for major sections
- Badges for status indicators
- Dialogs for forms and confirmations
- Buttons with loading states
- Smooth transitions and animations

---

## **Technical Implementation**

### **Frontend Stack**
- React with TypeScript
- Tailwind CSS for styling
- shadcn/ui component library
- Lucide React for icons
- Sonner for toast notifications
- Google Maps JavaScript API
- Supabase client for authentication

### **Backend Architecture**
Three-tier architecture:
- **Frontend** → **Hono Server** → **Supabase Database**

### **Backend (Supabase Edge Functions)**
- Hono web server in `/supabase/functions/server/index.tsx`
- All routes prefixed with `/make-server-8b08beda`
- CORS enabled for all origins
- Error logging with detailed context

### **API Routes**
```
POST /make-server-8b08beda/register
POST /make-server-8b08beda/send-reset-code
POST /make-server-8b08beda/reset-password
GET  /make-server-8b08beda/profile
POST /make-server-8b08beda/update-coins

POST /make-server-8b08beda/driver/status
POST /make-server-8b08beda/driver/generate-otp
GET  /make-server-8b08beda/driver/otps
POST /make-server-8b08beda/driver/stop-otp
GET  /make-server-8b08beda/driver/location-shares
POST /make-server-8b08beda/driver/update-stop
PUT  /make-server-8b08beda/driver/update-routes

POST /make-server-8b08beda/passenger/share-location
POST /make-server-8b08beda/passenger/stop-sharing
POST /make-server-8b08beda/passenger/update-location

GET  /make-server-8b08beda/buses
GET  /make-server-8b08beda/bus/:busId/stops
GET  /make-server-8b08beda/available-buses
POST /make-server-8b08beda/add-bus
```

### **Database (KV Store)**
Use Supabase KV store (`/supabase/functions/server/kv_store.tsx`):

**Key Patterns:**
- `user:{userId}` - User profile data
- `driver:{userId}` - Driver status and settings
- `bus:{userId}` - Active bus locations
- `otp:{driverId}:{timestamp}` - OTP records
- `share:{userId}:{timestamp}` - Location sharing sessions
- `reset:{email}:{timestamp}` - Password reset codes
- `available_buses` - List of all buses
- `bus_routes:{busName}` - Custom routes for buses

**Data Models:**
```typescript
User {
  id: string
  name: string
  email: string
  role: 'driver' | 'passenger'
  coins: number
  createdAt: string
  tripHistory: Trip[]
}

Driver {
  isOnline: boolean
  route: string
  currentLocation: { lat: number, lng: number }
  lastUpdated: string
  tripStartTime: string | null
  previousLocations: Location[]
}

Bus {
  id: string (userId)
  driverName: string
  route: string (bus name)
  lat: number
  lng: number
  isOnline: boolean
  lastUpdated: string
  busStops: BusStop[]
  isPassengerDriver: boolean
}

OTP {
  id: string
  code: string (6 digits)
  driverId: string
  driverName: string
  busName: string
  createdAt: string
  expiresAt: string (5 hours from creation)
  used: boolean
}

LocationShare {
  id: string
  userId: string
  userName: string
  busName: string
  lat: number
  lng: number
  active: boolean
  startTime: string
  expiresAt: string (5 hours)
  driverId: string
  otpCode: string
}

BusStop {
  id: string
  name: string
  lat: number
  lng: number
  order: number
  passed: boolean
}
```

### **Authentication**
- Supabase Auth with service role key
- JWT tokens for API authorization
- Token passed in Authorization header
- Session persistence in browser
- Auto-confirm email (no email server)

### **State Management**
- React useState and useEffect hooks
- LocalStorage for persistence:
  - App state (activeTab, isOnline, isLocationSharing)
  - Location sharing state
- Real-time data polling every second
- Optimistic UI updates

### **Error Handling**
- Try-catch blocks for all async operations
- Detailed error logging to console
- User-friendly error messages via toasts
- Graceful fallbacks for missing data
- Network error handling
- **Comprehensive validation on backend**

---

## **Key Features Summary**

✅ Dual role system (Driver/Passenger)  
✅ Complete authentication with password reset  
✅ Real-time location tracking (1-second updates)  
✅ OTP-based location sharing (5-hour validity)  
✅ Coin system with purchases  
✅ Google Maps with aerial view  
✅ Bus route editing with coordinates  
✅ Predefined PSNACET bus list  
✅ Add new buses (drivers only)  
✅ Bus availability validation  
✅ Passenger locations as bus icons  
✅ Comprehensive error messaging  
✅ Location permission handling  
✅ Feedback system to email  
✅ Trip limits (5 per day)  
✅ Auto-stop after 5 hours  
✅ Route visualization  
✅ Stop marking system  
✅ Real-time updates  
✅ Mobile-first responsive design  
✅ Session persistence  
✅ Background location tracking  

---

## **File Structure**

```
├── App.tsx (Main component with state management)
├── components/
│   ├── OnboardingFlow.tsx (Sign up/sign in)
│   ├── ForgotPassword.tsx (Password reset)
│   ├── RoleSelection.tsx (Role selection screen)
│   ├── DriverDashboard.tsx (Driver interface)
│   ├── PassengerDashboard.tsx (Passenger interface)
│   ├── MapView.tsx (Google Maps integration)
│   └── ui/ (shadcn/ui components)
├── supabase/functions/server/
│   ├── index.tsx (Hono server with all routes)
│   └── kv_store.tsx (Database utilities - DO NOT MODIFY)
├── utils/
│   ├── api.ts (API client wrapper)
│   └── supabase/info.tsx (Supabase config)
└── styles/globals.css (Global styles)
```

---

## **Environment Variables (Already Configured)**

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server
- `SUPABASE_DB_URL` - Database connection string

---

## **Important Implementation Notes**

1. **Do NOT modify** `/supabase/functions/server/kv_store.tsx`
2. **Real-time updates**: Use 1-second intervals for location tracking
3. **Passenger sharing**: Display as bus icons, not user markers
4. **Error messages**: Be specific and actionable
5. **Location permission**: Handle all edge cases with notifications
6. **OTP expiry**: Enforce 5-hour limit strictly
7. **Bus validation**: Prevent duplicate bus sharing
8. **Trip limits**: Enforce 5 trips per day per driver
9. **Coin deduction**: Happens on sharing start (not per update)
10. **Route persistence**: Save custom routes to database
11. **Default location**: PSNACET campus coordinates
12. **Feedback**: Opens email client, doesn't send directly
13. **Map type**: Use aerial/satellite view specifically
14. **All React warnings**: Must be resolved (forwardRef, DialogDescription)
15. **Console errors**: Must be clean, no runtime errors

---

## **Testing Checklist**

- [ ] Driver can sign up and sign in
- [ ] Passenger can sign up and sign in
- [ ] Password reset flow works
- [ ] Driver can go online with bus selection
- [ ] Error shown if bus already in use
- [ ] Driver can generate OTP
- [ ] OTP expires after 5 hours
- [ ] Passenger can share location with OTP
- [ ] Costs 10 coins when sharing starts
- [ ] Sharing auto-stops after 5 hours
- [ ] Passenger appears as bus icon on map
- [ ] Real-time updates work (1-second refresh)
- [ ] Location permission requests show proper notifications
- [ ] Bus stops can be edited (add/remove/reorder)
- [ ] Route editing saves to database
- [ ] Map shows all online buses
- [ ] Click bus shows route and stops
- [ ] Passed stops marked correctly
- [ ] Driver can stop passenger sharing
- [ ] Coin purchases work
- [ ] Trip history tracked
- [ ] 5 trips per day limit enforced
- [ ] Feedback button opens email
- [ ] All errors show user-friendly messages
- [ ] No console errors or warnings
- [ ] Mobile responsive design works
- [ ] Session persists on refresh
- [ ] Background location tracking works

---

**This prompt contains ALL implementation details for recreating the BusTracker application without missing any features.**
