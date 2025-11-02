import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'npm:@supabase/supabase-js@2'
import * as kv from './kv_store.tsx'

const app = new Hono()

// Middleware
app.use('*', cors({
  origin: '*',
  allowHeaders: ['*'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
}))
app.use('*', logger(console.log))

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Helper function to authenticate requests
async function authenticateRequest(request: Request) {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return { error: 'No authorization token provided', user: null };
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return { error: 'Invalid or expired token', user: null };
  }

  return { error: null, user };
}

// Helper function to initialize default buses
async function initializeDefaultBuses() {
  const existingBuses = await kv.get('available_buses')
  if (!existingBuses) {
    const defaultBusNumbers = [30, 29, "31/56", 36, 35, 32, 69, 73, 72, 74, 20, "23/22", 28, 25, 26, 27, 45, 47, 38, 51, 34, "33/39", 53, 54, 44, 40, 59, 42, 43, 46, 57, 48, 49, 52, 41, 55, 50, 58, 60, 61]
    const buses = defaultBusNumbers.map(num => `PSNA-${num}`)
    await kv.set('available_buses', buses)
    return buses
  }
  return existingBuses
}

// Default bus routes configuration
const DEFAULT_BUS_ROUTES = {
  "PSNA-30": [
    "MURUGABHAVANAM",
    "AYYANGULAM",
    "SAKTHI TALKIES",
    "AARIYABHAVAN",
    "VANI VILAS",
    "JEGANATH HOSPITAL",
    "SONA TOWER",
    "AMMA MESS",
    "12TH CROSS",
    "9TH CROSS",
    "8TH CROSS",
    "7TH CROSS",
    "WATER TANK",
    "4TH CROSS",
    "MVM COLLEGE",
    "ANJALI BYE PASS",
    "PSNACET"
  ],
  "PSNA-29": [
    "BALAKRISHNAPURAM",
    "SMBM SCHOOL",
    "SP OFFICE",
    "DGL SCAN",
    "DGL BUS STAND",
    "DGL G.H",
    "AARIYABHAVAN",
    "PALANI BYE.PASS",
    "PSNACET"
  ],
  "PSNA-31/56": [
    "KULLANAMPATTY",
    "II RMTC",
    "VIJAY THEATRE",
    "NAGAL NAGAR",
    "ANNAMALAYAR SCHOOL",
    "BHARATH!PURAM",
    "BHUVANESWARI AMMAN KOVIL",
    "METTUPATTY",
    "BEGAMBUR",
    "PARAPATTI K",
    "A.P NAGAR",
    "PSNACET"
  ],
  "PSNA-36": [
    "CHINNALAPATTY",
    "POONCHOLAI",
    "CHINNALAPATTY PIRIVU",
    "KEELAKOTTAI BYE-PASS",
    "CHETTIYAPATTY PIRIVU",
    "KALIKAM PATTY PIRIVU",
    "POKUVARATHU NAGAR",
    "VELLODU PIRIVU",
    "PANJAM PATTY PIRIVU (EAST)",
    "COFFEE SHOP",
    "ANNAMALAYAR MILL",
    "THOMAYARPURAM",
    "PSNACET"
  ],
  "PSNA-35": [
    "SMBM SCHOOL",
    "SP OFFICE",
    "SP OFFICE",
    "DGL BUS STAND",
    "AARIYABHAVAN",
    "VANI VILAS SIGNAL",
    "PALANI BYE-PASS",
    "PSNACET"
  ],
  "PSNA-32": [
    "MA.MU.KOVILUR PIRIVU",
    "SEELAPADI BYE.PASS",
    "NGA MILL",
    "NGO COLONY",
    "UZAVAR SANTHAI",
    "CITY HOSPITAL",
    "PSNACET"
  ],
  "PSNA-69": [
    "MA.MU.KOVILUR PIRIVU",
    "POLICE QUARTERS",
    "SEELAPADI BYE.PASS",
    "OIL MILL",
    "NIVIS MAHAL",
    "CHETTINAICKEN PATTI PIRIVU",
    "ANJALI BYE.PASS",
    "PSNACET"
  ],
  "PSNA-73": [
    "SMBM SCHOOL",
    "MSP SCHOOL",
    "AMMA MESS",
    "12TH CROSS",
    "9TH CROSS",
    "7TH CROSS",
    "WATER TANK",
    "4TH CROSS",
    "MVM COLLEGE",
    "ANJALI BYE PASS",
    "PSNACET"
  ],
  "PSNA-72": [
    "DGL SCAN",
    "DGL BUS STAND",
    "DGL GH",
    "AARIYABHAVAN",
    "VANI VILAS SIGNAL",
    "PALANI BYE.PASS",
    "PSNACET"
  ],
  "PSNA-74": [
    "PATTIVEERAN PATTY",
    "ANNA NAGAR",
    "SAVADI",
    "RADIO POTTAL",
    "GANDHI PURAM",
    "THEVARAN PATTY PIRIVU",
    "VEPPAMARAM",
    "ARASAMARAM",
    "GANESHAPURAM",
    "AATHUR TALUK OFFICE",
    "AATHUR BUS STAND",
    "S PARAI PATTY",
    "DHARUMATHUPATTY",
    "KANNIVADI",
    "AALATHURAN PATTY",
    "PUDHUPATTY",
    "REDDIYAR CHATRAM",
    "PSNACET"
  ]
}

// Helper function to get default routes for a bus
async function getDefaultRoutesForBus(busName: string) {
  // Check if there are custom routes stored
  const customRoutes = await kv.get(`bus_routes:${busName}`)
  if (customRoutes) {
    return customRoutes
  }
  
  // Return default routes if available
  if (DEFAULT_BUS_ROUTES[busName]) {
    const routes = DEFAULT_BUS_ROUTES[busName].map((name, index) => ({
      id: `${busName}_stop_${index + 1}`,
      name: name,
      order: index + 1,
      passed: false,
      lat: 0,
      lng: 0
    }))
    return routes
  }
  
  return []
}

// Routes
app.get('/make-server-8b08beda/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// User registration
app.post('/make-server-8b08beda/register', async (c) => {
  try {
    const { name, email, password, role } = await c.req.json()
    
    // Check if user already exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (!listError && users) {
      const existingUser = users.find(u => u.email === email)
      if (existingUser) {
        return c.json({ error: 'Email already registered' }, 400)
      }
    }
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    })

    if (error) {
      console.log('Registration error:', error)
      if (error.message.includes('already') || error.message.includes('exists')) {
        return c.json({ error: 'Email already registered' }, 400)
      }
      return c.json({ error: 'Registration failed: ' + error.message }, 400)
    }

    // Initialize user data in KV store
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      name,
      email,
      role,
      coins: role === 'passenger' ? 50 : 0,
      createdAt: new Date().toISOString()
    })

    if (role === 'driver') {
      await kv.set(`driver:${data.user.id}`, {
        isOnline: false,
        route: '',
        currentLocation: null,
        lastUpdated: new Date().toISOString()
      })
    }

    return c.json({ 
      user: data.user, 
      message: 'User registered successfully' 
    })
  } catch (error) {
    console.log('Registration error:', error)
    return c.json({ error: 'Internal server error during registration' }, 500)
  }
})

// Send password reset code
app.post('/make-server-8b08beda/send-reset-code', async (c) => {
  try {
    const { email } = await c.req.json()
    
    if (!email) {
      return c.json({ error: 'Email is required' }, 400)
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const resetId = `reset:${email}:${Date.now()}`
    
    const resetData = {
      id: resetId,
      email,
      code,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      used: false
    }

    await kv.set(resetId, resetData)

    // In a real implementation, send email via Supabase
    // For now, just return success (code would be sent to console in dev)
    console.log(`Password reset code for ${email}: ${code}`)

    return c.json({ success: true, message: 'Verification code sent' })
  } catch (error) {
    console.log('Send reset code error:', error)
    return c.json({ error: 'Failed to send reset code' }, 500)
  }
})

// Reset password with verification code
app.post('/make-server-8b08beda/reset-password', async (c) => {
  try {
    const { email, code, newPassword } = await c.req.json()
    
    if (!email || !code || !newPassword) {
      return c.json({ error: 'Email, code, and new password are required' }, 400)
    }

    // Find valid reset code
    const allResets = await kv.getByPrefix(`reset:${email}:`)
    const validReset = allResets.find(reset => 
      reset.code === code && 
      !reset.used && 
      new Date(reset.expiresAt) > new Date()
    )

    if (!validReset) {
      return c.json({ error: 'Invalid or expired verification code' }, 400)
    }

    // Find user by email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      return c.json({ error: 'Failed to find user' }, 500)
    }

    const user = users.find(u => u.email === email)
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      return c.json({ error: 'Failed to update password' }, 500)
    }

    // Mark reset code as used
    await kv.set(validReset.id, { ...validReset, used: true })

    return c.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    console.log('Reset password error:', error)
    return c.json({ error: 'Failed to reset password' }, 500)
  }
})

// Get user profile
app.get('/make-server-8b08beda/profile', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const userData = await kv.get(`user:${user.id}`)
    if (!userData) {
      return c.json({ error: 'User profile not found' }, 404)
    }

    return c.json({ user: userData })
  } catch (error) {
    console.log('Profile fetch error:', error)
    return c.json({ error: 'Failed to fetch user profile' }, 500)
  }
})

// Update user coins
app.post('/make-server-8b08beda/update-coins', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const { amount, operation } = await c.req.json() // operation: 'add' or 'subtract'
    
    const userData = await kv.get(`user:${user.id}`)
    if (!userData) {
      return c.json({ error: 'User not found' }, 404)
    }

    let newCoins = userData.coins || 0
    if (operation === 'add') {
      newCoins += amount
    } else if (operation === 'subtract') {
      newCoins = Math.max(0, newCoins - amount)
    }

    const updatedUser = { ...userData, coins: newCoins }
    await kv.set(`user:${user.id}`, updatedUser)

    return c.json({ coins: newCoins })
  } catch (error) {
    console.log('Coin update error:', error)
    return c.json({ error: 'Failed to update coins' }, 500)
  }
})

// Driver goes online/offline
app.post('/make-server-8b08beda/driver/status', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const { isOnline, location, route, busName } = await c.req.json()
    
    // Get user data for trip count tracking
    const userData = await kv.get(`user:${user.id}`)
    if (!userData) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Check trip limits (5 trips per day)
    if (isOnline && busName) {
      const today = new Date().toDateString()
      const tripHistory = userData.tripHistory || []
      const todaysTrips = tripHistory.filter((trip: any) => 
        new Date(trip.startTime).toDateString() === today
      )
      
      if (todaysTrips.length >= 5) {
        return c.json({ error: 'Daily trip limit reached (5 trips per day)' }, 400)
      }

      // Validate bus name uniqueness
      const allBuses = await kv.getByPrefix('bus:')
      const existingBus = allBuses.find(bus => 
        bus.route === busName && bus.id !== user.id && bus.isOnline
      )
      
      if (existingBus) {
        return c.json({ error: 'This bus location is already being shared' }, 400)
      }
    }
    
    const driverData = {
      isOnline,
      route: route || busName || '',
      currentLocation: location,
      lastUpdated: new Date().toISOString(),
      tripStartTime: isOnline ? new Date().toISOString() : null,
      previousLocations: [] // Track for speed/heading calculation
    }

    await kv.set(`driver:${user.id}`, driverData)

    // Track trip history (coin rewards disabled - future feature for payment integration)
    if (isOnline && location && busName) {
      // Check if this is a new trip
      const tripHistory = userData.tripHistory || []
      const newTrip = {
        busName,
        startTime: new Date().toISOString(),
        endTime: null
      }
      
      const updatedUser = { 
        ...userData,
        // coins: (userData.coins || 0) + 10, // Disabled - will be enabled with payment gateway
        tripHistory: [...tripHistory, newTrip]
      }
      await kv.set(`user:${user.id}`, updatedUser)
    } else if (!isOnline) {
      // Mark trip as ended
      const tripHistory = userData.tripHistory || []
      if (tripHistory.length > 0) {
        const lastTrip = tripHistory[tripHistory.length - 1]
        if (!lastTrip.endTime) {
          lastTrip.endTime = new Date().toISOString()
          await kv.set(`user:${user.id}`, { ...userData, tripHistory })
        }
      }
    }

    // Store in bus locations for passengers to see
    if (isOnline && location && busName) {
      const userData = await kv.get(`user:${user.id}`)
      
      // Create sample bus stops for demonstration
      const busStops = [
        { id: `${user.id}_stop_1`, name: 'Main Station', lat: location.lat + 0.001, lng: location.lng + 0.001, order: 1, passed: false },
        { id: `${user.id}_stop_2`, name: 'Central Plaza', lat: location.lat + 0.002, lng: location.lng + 0.002, order: 2, passed: false },
        { id: `${user.id}_stop_3`, name: 'Shopping Mall', lat: location.lat + 0.003, lng: location.lng + 0.003, order: 3, passed: false },
        { id: `${user.id}_stop_4`, name: 'University', lat: location.lat + 0.004, lng: location.lng + 0.004, order: 4, passed: false },
        { id: `${user.id}_stop_5`, name: 'Hospital', lat: location.lat + 0.005, lng: location.lng + 0.005, order: 5, passed: false },
      ]

      await kv.set(`bus:${user.id}`, {
        id: user.id,
        driverName: userData?.name || 'Unknown Driver',
        route: busName,
        lat: location.lat,
        lng: location.lng,
        isOnline: true,
        lastUpdated: new Date().toISOString(),
        busStops: busStops
      })
    } else {
      await kv.del(`bus:${user.id}`)
    }

    return c.json({ success: true, status: driverData })
  } catch (error) {
    console.log('Driver status update error:', error)
    return c.json({ error: 'Failed to update driver status' }, 500)
  }
})

// Generate OTP
app.post('/make-server-8b08beda/driver/generate-otp', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const otpId = `otp:${user.id}:${Date.now()}`
    
    const userData = await kv.get(`user:${user.id}`)
    const driverData = await kv.get(`driver:${user.id}`)
    
    const otpData = {
      id: otpId,
      code,
      driverId: user.id,
      driverName: userData?.name || 'Unknown',
      busName: driverData?.route || '',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(), // 5 hours
      used: false
    }

    await kv.set(otpId, otpData)

    return c.json({ otp: otpData })
  } catch (error) {
    console.log('OTP generation error:', error)
    return c.json({ error: 'Failed to generate OTP' }, 500)
  }
})

// Get driver's active OTPs
app.get('/make-server-8b08beda/driver/otps', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const otps = await kv.getByPrefix(`otp:${user.id}:`)
    const activeOTPs = otps.filter(otp => 
      !otp.used && new Date(otp.expiresAt) > new Date()
    )

    return c.json({ otps: activeOTPs })
  } catch (error) {
    console.log('OTP fetch error:', error)
    return c.json({ error: 'Failed to fetch OTPs' }, 500)
  }
})

// Validate OTP and start location sharing (passenger acts as driver)
app.post('/make-server-8b08beda/passenger/share-location', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const { otpCode, location, busName } = await c.req.json()
    
    // Get user data
    const userData = await kv.get(`user:${user.id}`)
    if (!userData) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Find and validate OTP
    const allOTPs = await kv.getByPrefix('otp:')
    const validOTP = allOTPs.find(otp => 
      otp.code === otpCode && 
      !otp.used && 
      new Date(otp.expiresAt) > new Date()
    )

    if (!validOTP) {
      return c.json({ error: 'Invalid or expired OTP' }, 400)
    }

    // Validate bus name is provided
    if (!busName) {
      return c.json({ error: 'Bus name is required' }, 400)
    }

    // Check if bus is already in use
    const allBuses = await kv.getByPrefix('bus:')
    const existingBus = allBuses.find(bus => 
      bus.route === busName && bus.id !== user.id && bus.isOnline
    )
    
    if (existingBus) {
      return c.json({ error: 'Bus name is already in use' }, 400)
    }

    // Mark OTP as used
    await kv.set(validOTP.id, { ...validOTP, used: true, usedBy: user.id, usedAt: new Date().toISOString() })

    // Create bus entry (passenger acting as driver)
    const busStops = await getDefaultRoutesForBus(busName)
    
    await kv.set(`bus:${user.id}`, {
      id: user.id,
      driverName: userData.name,
      route: busName,
      lat: location.lat,
      lng: location.lng,
      isOnline: true,
      lastUpdated: new Date().toISOString(),
      busStops: busStops,
      isPassengerDriver: true, // Mark as passenger acting as driver
      otpId: validOTP.id,
      tripStartTime: new Date().toISOString(),
      previousLocations: []
    })

    // Create location share record
    const shareId = `share:${user.id}:${Date.now()}`
    const shareData = {
      id: shareId,
      userId: user.id,
      userName: userData.name,
      busName: busName,
      lat: location.lat,
      lng: location.lng,
      active: true,
      startTime: new Date().toISOString(),
      expiresAt: validOTP.expiresAt, // 5 hours from OTP creation
      driverId: validOTP.driverId,
      otpCode: otpCode
    }

    await kv.set(shareId, shareData)

    return c.json({ 
      success: true, 
      share: shareData,
      message: 'Location sharing started! Valid for 5 hours.'
    })
  } catch (error) {
    console.log('Location sharing error:', error)
    return c.json({ error: 'Failed to start location sharing' }, 500)
  }
})

// Stop location sharing (passenger or driver can stop)
app.post('/make-server-8b08beda/passenger/stop-sharing', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const { shareId } = await c.req.json()
    
    // If shareId provided, stop that specific share (driver stopping passenger)
    if (shareId) {
      const share = await kv.get(shareId)
      if (share) {
        await kv.set(shareId, { ...share, active: false })
        // Remove bus entry if passenger was acting as driver
        await kv.del(`bus:${share.userId}`)
      }
    } else {
      // Stop own sharing (passenger stopping themselves)
      const shares = await kv.getByPrefix(`share:${user.id}:`)
      const activeShare = shares.find(share => share.active)

      if (activeShare) {
        await kv.set(activeShare.id, { ...activeShare, active: false })
        // Remove bus entry if passenger was acting as driver
        await kv.del(`bus:${user.id}`)
      }
    }

    return c.json({ success: true })
  } catch (error) {
    console.log('Stop sharing error:', error)
    return c.json({ error: 'Failed to stop location sharing' }, 500)
  }
})

// Stop OTP (Driver can revoke an OTP)
app.post('/make-server-8b08beda/driver/stop-otp', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const { otpId } = await c.req.json()
    
    const otp = await kv.get(otpId)
    if (otp && otp.driverId === user.id) {
      await kv.set(otpId, { ...otp, used: true, revokedAt: new Date().toISOString() })
      
      // Stop any active shares using this OTP
      const allShares = await kv.getByPrefix('share:')
      const otpShares = allShares.filter(share => share.otpCode === otp.code && share.active)
      
      for (const share of otpShares) {
        await kv.set(share.id, { ...share, active: false })
        await kv.del(`bus:${share.userId}`)
      }
      
      return c.json({ success: true })
    }
    
    return c.json({ error: 'OTP not found or unauthorized' }, 404)
  } catch (error) {
    console.log('Stop OTP error:', error)
    return c.json({ error: 'Failed to stop OTP' }, 500)
  }
})

// Get all active buses for passengers
app.get('/make-server-8b08beda/buses', async (c) => {
  try {
    const buses = await kv.getByPrefix('bus:')
    const activeBuses = buses.filter(bus => bus.isOnline)

    return c.json({ buses: activeBuses })
  } catch (error) {
    console.log('Buses fetch error:', error)
    return c.json({ error: 'Failed to fetch bus locations' }, 500)
  }
})

// Get active location shares for a driver
app.get('/make-server-8b08beda/driver/location-shares', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const allShares = await kv.getByPrefix('share:')
    const driverShares = allShares.filter(share => 
      share.active && share.driverId === user.id
    )

    return c.json({ shares: driverShares })
  } catch (error) {
    console.log('Location shares fetch error:', error)
    return c.json({ error: 'Failed to fetch location shares' }, 500)
  }
})

// Update passenger location (for active sharing - passenger acting as driver)
app.post('/make-server-8b08beda/passenger/update-location', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const { location } = await c.req.json()
    
    const shares = await kv.getByPrefix(`share:${user.id}:`)
    const activeShare = shares.find(share => share.active)

    if (activeShare) {
      // Check if 5 hours have passed since start
      const startTime = new Date(activeShare.startTime).getTime()
      const now = new Date().getTime()
      const fiveHoursInMs = 5 * 60 * 60 * 1000
      
      if (now - startTime > fiveHoursInMs) {
        // Auto-stop after 5 hours
        await kv.set(activeShare.id, { ...activeShare, active: false })
        await kv.del(`bus:${user.id}`)
        return c.json({ success: false, error: 'Location sharing expired after 5 hours', expired: true })
      }
      
      // Update bus location with speed/heading tracking
      const busData = await kv.get(`bus:${user.id}`)
      if (busData) {
        const previousLocations = busData.previousLocations || []
        previousLocations.push({
          lat: busData.lat,
          lng: busData.lng,
          timestamp: busData.lastUpdated
        })
        
        // Keep only last 10 locations for calculation
        if (previousLocations.length > 10) {
          previousLocations.shift()
        }
        
        await kv.set(`bus:${user.id}`, {
          ...busData,
          lat: location.lat,
          lng: location.lng,
          lastUpdated: new Date().toISOString(),
          previousLocations
        })
      }
      
      const updatedShare = {
        ...activeShare,
        lat: location.lat,
        lng: location.lng,
        lastUpdated: new Date().toISOString()
      }
      await kv.set(activeShare.id, updatedShare)
      return c.json({ success: true, share: updatedShare })
    }

    return c.json({ error: 'No active location sharing found' }, 404)
  } catch (error) {
    console.log('Location update error:', error)
    return c.json({ error: 'Failed to update location' }, 500)
  }
})

// Get bus stops for a specific bus
app.get('/make-server-8b08beda/bus/:busId/stops', async (c) => {
  try {
    const busId = c.req.param('busId')
    const busData = await kv.get(`bus:${busId}`)
    
    if (!busData) {
      return c.json({ error: 'Bus not found' }, 404)
    }

    // If bus has no stops, try to get default routes
    let busStops = busData.busStops || []
    if (busStops.length === 0) {
      busStops = await getDefaultRoutesForBus(busData.route)
    }

    return c.json({ busStops })
  } catch (error) {
    console.log('Bus stops fetch error:', error)
    return c.json({ error: 'Failed to fetch bus stops' }, 500)
  }
})

// Update bus stop status (driver marks stop as passed)
app.post('/make-server-8b08beda/driver/update-stop', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const { stopId, passed } = await c.req.json()
    
    const busData = await kv.get(`bus:${user.id}`)
    if (!busData) {
      return c.json({ error: 'Bus not found' }, 404)
    }

    const updatedBusStops = busData.busStops?.map(stop => 
      stop.id === stopId ? { ...stop, passed } : stop
    ) || []

    const updatedBusData = {
      ...busData,
      busStops: updatedBusStops,
      lastUpdated: new Date().toISOString()
    }

    await kv.set(`bus:${user.id}`, updatedBusData)

    return c.json({ success: true, busStops: updatedBusStops })
  } catch (error) {
    console.log('Bus stop update error:', error)
    return c.json({ error: 'Failed to update bus stop' }, 500)
  }
})

// Update multiple bus stops (driver edits route names)
app.post('/make-server-8b08beda/driver/update-stops', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const { busId, busStops } = await c.req.json()
    
    // Verify the bus belongs to this driver
    if (busId !== user.id) {
      return c.json({ error: 'Unauthorized to update this bus' }, 403)
    }

    const busData = await kv.get(`bus:${user.id}`)
    if (!busData) {
      return c.json({ error: 'Bus not found' }, 404)
    }

    const updatedBusData = {
      ...busData,
      busStops: busStops,
      lastUpdated: new Date().toISOString()
    }

    await kv.set(`bus:${user.id}`, updatedBusData)

    return c.json({ success: true, busStops: busStops })
  } catch (error) {
    console.log('Bus stops update error:', error)
    return c.json({ error: 'Failed to update bus stops' }, 500)
  }
})

// Add a new route stop (driver adds route)
app.post('/make-server-8b08beda/driver/add-route', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const { busId, routeName } = await c.req.json()
    
    // Verify the bus belongs to this driver
    if (busId !== user.id) {
      return c.json({ error: 'Unauthorized to update this bus' }, 403)
    }

    if (!routeName || !routeName.trim()) {
      return c.json({ error: 'Route name is required' }, 400)
    }

    const busData = await kv.get(`bus:${user.id}`)
    if (!busData) {
      return c.json({ error: 'Bus not found' }, 404)
    }

    // Get existing stops or default routes
    let busStops = busData.busStops || []
    if (busStops.length === 0) {
      busStops = await getDefaultRoutesForBus(busData.route)
    }

    // Create new stop
    const newOrder = busStops.length + 1
    const newStop = {
      id: `${busData.route}_stop_${newOrder}_${Date.now()}`,
      name: routeName.trim(),
      order: newOrder,
      passed: false,
      lat: 0,
      lng: 0
    }

    const updatedBusStops = [...busStops, newStop]

    const updatedBusData = {
      ...busData,
      busStops: updatedBusStops,
      lastUpdated: new Date().toISOString()
    }

    await kv.set(`bus:${user.id}`, updatedBusData)

    return c.json({ success: true, busStops: updatedBusStops })
  } catch (error) {
    console.log('Add route error:', error)
    return c.json({ error: 'Failed to add route' }, 500)
  }
})

// Get available bus list (public endpoint - no auth required)
app.get('/make-server-8b08beda/buses/available', async (c) => {
  try {
    const buses = await initializeDefaultBuses()
    return c.json({ buses })
  } catch (error) {
    console.log('Fetching available buses error:', error)
    return c.json({ error: 'Failed to fetch available buses' }, 500)
  }
})

// Add new bus to the list (drivers only)
app.post('/make-server-8b08beda/buses/add', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const userData = await kv.get(`user:${user.id}`)
    if (!userData || userData.role !== 'driver') {
      return c.json({ error: 'Only drivers can add new buses' }, 403)
    }

    const { busName } = await c.req.json()
    
    if (!busName || !busName.trim()) {
      return c.json({ error: 'Bus name is required' }, 400)
    }

    const formattedBusName = busName.trim()
    
    const buses = await initializeDefaultBuses()
    
    if (buses.includes(formattedBusName)) {
      return c.json({ error: 'Bus already exists in the list' }, 400)
    }

    const updatedBuses = [...buses, formattedBusName]
    await kv.set('available_buses', updatedBuses)

    return c.json({ success: true, buses: updatedBuses, message: 'Bus added successfully' })
  } catch (error) {
    console.log('Adding bus error:', error)
    return c.json({ error: 'Failed to add bus' }, 500)
  }
})

// Start the server
Deno.serve(app.fetch)