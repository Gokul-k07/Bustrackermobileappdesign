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
    const defaultBusNumbers = [30, 29, 31, 56, 36, 35, 32, 69, 73, 72, 74, 20, 23, 22, 28, 25, 26, 27, 45, 47, 38, 51, 34, 33, 39, 53, 54, 44, 40, 59, 42, 43, 46, 57, 48, 49, 52, 41, 55, 50, 58, 60, 61]
    const buses = defaultBusNumbers.map(num => `PSNA-${num}`)
    await kv.set('available_buses', buses)
    return buses
  }
  return existingBuses
}

// Default bus routes configuration
const DEFAULT_BUS_ROUTES = {

"PSNA-25": ["KOVILUR", "PUDHU ROAD", "ERIYODU", "THOTANAMPATTY", "NALAMANAKAR KOTTAI", "KULATHUR", "RVS COLLEGE", "GTN COLLEGE", "NS NAGAR", "THANEER PANTHAL", "PSNACET"],
"PSNA-26": ["KALLIMANDAYAM", "P.K.VALASU", "AMBILIKKHAI HOSPITAL", "AMBILIKKAI", "BOY SALAI", "KOSAVAPATTI", "PATTALAMMAN KOVIL", "PNK KALYANA MANDAPAM", "O.D.C G.H", "E.B OFFICE", "KARTHIK THEATRE", "THUMMICHAMPATTI BYE-PASS", "KADAIVEETHI", "INDIAN THEATRE", "ODC BUS STAND", "NAGANAMPATTY PIRIVU", "RMTC DEPOT", "CHECK POST", "MOOLACHATRAM", "PALAKANOOTHU", "SEMMADAIPATTY", "REDDIARCHATRAM", "PSNACET"],
"PSNA-27": ["VEDASANDUR BUS STAND", "ATHUMEDU", "KONGU NAGAR", "KALANAM PATTY", "VELAYUTHASAMY MILL", "KAKATOPPU", "LAKSHMANAPATTY", "EVARADY MILLS", "VITTALNAYAKKAN PATTI", "KARIYAMPATTY", "AGARAM", "THADIKOMPU", "KAMATCHIPURAM", "SENGULAM", "SARALAPPATTI", "COLLECTORATE", "PSNACET"],
"PSNA-45": ["MADURA COLLEGE (MEGRA)", "ANDAL PURAM", "NATRAJ THEATRE", "FENNER", "KOCHADAI", "PSNACET"],
"PSNA-47": ["KALAVASAL", "PP CHAVADI", "BELL HOTEL(FENNER)", "TVS", "HMS COLONY", "VIRATTIPATTHU/ATCHAMPATTHU", "MUDAKKUSALAI", "NAGAMALAI BY PASS", "THANICHTHAYAM PIRIVU", "AANDIPATTI BANGALA", "PSNACET"],
"PSNA-38": ["BATALAGUNDU BUS STAND", "POLICE STATION", "KALIAMMAN KOVIL", "KATTASPATHIRI", "INDIAN OIL", "STATE BANK COLONY", "A.PRIVU", "LAKSHMI PURAM", "PSNACET"],
"PSNA-51": ["GURU THEATRE", "THEEKKATHIR", "FATHIMA COLLEGE", "KARISAL KULAM", "VILANGUDI", "VISTHARA APARTMENT", "MADHURAI RADHA", "PARAVAI", "POWER HOUSE", "SAMAYANALLUR", "AYYAMKOΟΤΑΙ", "PSNACET"],
"PSNA-34": ["PERIYAKULAM BHARATHIPURAM", "PERIYAKULAM GANDHI STATUE", "JAYA THEATRE", "RMTC SET", "DEVATHANAPATTY", "KOVILPATTY", "GATT ROAD", "SENGULAM PIRIVU", "MEENATCHIPURAM", "OLD BATTALAGUNDU", "MEENATCHI HOTEL", "MUTHALAPURAM", "OTTUPPATTY", "SALAI PUDUR", "SITHAYANKOTTAI PIRIVU", "PSNACET"],
"PSNA-33": ["PALANI NEIKARAPATTY", "ALAGAPURI", "VANDI VAYKKAL", "KARAMADAI", "BALAJI MILL", "SAMY THEATRE", "RANAKALI AMMAN KOVIL", "PALANI BUS STAND", "T.B", "APA COLLEGE", "THIRU NAGAR", "HOUSING BOARD", "ITO SCHOOL", "OLD AYAKUDI", "NEW AYAKUDI", "KANAKKANPATTY", "CHATRAPATTY", "VIRUPPATCHI", "RELIANCE PETROL PUNK / RTO OFFICE", "PSNACET"],
"PSNA-53": ["VIRAGANOOR RING ROAD", "ILANALLU R (VIRAGANOOR)", "NIRMALA SCHOOL", "SANTHA PETTAI", "ICICI BANK", "ALANGAR THEATRE", "KEELAVASAAL", "PSNACET"],
"PSNA-54": ["SIMMAKKAL", "THAMILSANGAM ROAD(BELL HOTEL)", "MADURA COATS", "JAIL ROAD", "MATHI THEATRE", "AGARWAL HOSPITAL-AARAPALAYAM", "PSNACET"],
"PSNA-44": ["KADACHANENTHAL", "SURYA NAGAR", "SERVEYER COLONY", "MOONDRU MAVADI", "ALAGAR NAGAR", "K PUDUR", "I.T. STOP", "THAMARAI THOTTI", "OUT POST", "THALLAKULAM", "THAMUKKAM", "GORIPALAYAM", "PSNACET"],
"PSNA-40": ["AIRPORT/PERUNGUDI", "AVANIYAPURAM BYE PASS", "AVANIYAPURAM", "M.M.C COLONY", "PADMA THEATRE", "MEENATCHI NAGAR", "VILLAPURAM ARCH", "JAYA VILAS", "PSNACET"],
"PSNA-59": ["OTHAKADAI", "HIGH COURT", "VALAR NAGAR", "UTHANGUDI", "MATTUTHAVANI", "POO MARKET", "ENFILD COMPANY", "SUNDARAM PARK -", "APPOLO HOSPITAL", "MELAMADAI SIGNAL", "PALPANNAI", "ANNA BUS STAND", "MEDICAL COLLEGE", "PSNACET"],
"PSNA-42": ["THABAL THANTHI NAGAR", "RICE MILL STOP", "VALLUVAR COLONY", "BHARATHI STORE", "BHARATHI NAGAR", "SELLUR", "J.J.PALAM(ESI)", "KONNAVAYAN SALAI", "PSNACET"],
"PSNA-43": ["KAPPALUR", "THIYAGARAJAN MILL", "KAPPALUR SHIPGATE", "MADURAI CHILDRENS SCHOOL", "KOOTHIYAR GUNDU", "THOPPUR", "THANAKKAN KULAM", "MULLAINAGAR", "THIRUNAGAR", "THIRUNAGAR THIRD STOP", "HARVIPATTY", "PSNACET"],
"PSNA-46": ["OOMATCHI KULAM", "YADAVA COLLEGE - GENTS", "YADAVA COLLEGE - LADIES", "THIRUPPALAI", "KRISHNA NAGAR", "BANK COLONY", "NARAYANAPURAM", "RESERVE LINE", "MARIYAMMAN KOVIL", "PSNACET"],
"PSNA-57": ["ALANGANALLUR", "SIKKANTHAR SAVADI", "EB OFFICE", "RADIO STATION", "KOODAL NAGAR", "SANTHI NAGAR", "AALAMARAM", "PSNACET"],
"PSNA-48": ["NAGAMALAI PUDUKOTTAI", "SVN COLLEGE", "MAAVU MILL", "PILLAR SALAI", "RAJAMPADI", "PULIYAMKULAM", "CHEKKANOORANI", "MELAKKAL", "THACHAMBATHU", "SOZHAVANTHAN", "SOZHAVANTHAN THIRD STOP", "KARUPPATTY RAILWAY JUNCTION", "KEELANATCHI KULAM", "PSNACET"],
"PSNA-49": ["THIRUPARANKUNDRAM POONGA", "MOOLAKKARAI", "PASUMALAI", "ALAGAPPAN NAGAR", "BYKARA", "PALANGA NATHAM", "PSNACET"],
"PSNA-52": ["KRISHNAPURAM COLONY (P.P.KULAM)", "P.P.KULAM", "LADY DOOK COLLEGE", "NARIMEDU", "PSNACET"],
"PSNA-41": ["P.C.PERUKAYAM", "GOMATHI PURAM", "MELAMADAI", "KOCHA COMPLEX", "SUGUNA STORE", "AMBIGA THEATRE", "VAIGAI COLONY", "THEPPAKULAM", "GANESH THEATRE", "PSNACET"],
"PSNA-55": ["POTHAMETTUPPATTI", "MANAPPARAI BUS STAND", "MANGAMPATTI", "MULLIPADI", "AZAD ROAD", "VAIYAMPATTI", "PONNAMPALAMPATTI", "NADUPPATTI", "KALPATTI", "THANGAMMΜΑPATTI", "AYYALLUR", "MOORPATTI", "VADAMADURAI", "VADAMADURAI BUS STAND", "THANNEER THOTTI", "VADAMADURAI BYE-PASS", "SIVA MILL", "RAJAKKAPATTI", "SBM COLLEGE", "THAMARAIPADI", "MULLIPPADI", "PSNACET"],
"PSNA-50": ["PRC", "KFC", "PONMENI", "CHOKKALINGANAGAR", "PSNACET"],
"PSNA-58": ["SILUKKUVAR PATTY", "NILAKOTTAI", "MICHAELPALAYAM", "AACHIPURAM", "OTTUPPATTY", "KAMAKKAPATTYPRIVU", "METTUPATTY", "SEMPATTI", "AADHILAKSHMI PURAM", "VEERAKKAL PIRIVU", "VAKKAMPATTY PIRIVU", "ARIYANALLUR PIRIVU", "PANJAM PATTY PIRIVU (WEST)", "PITHALAPATTY", "PSNACET"],
"PSNA-60": ["KALLAR KALVI KALAGAM", "THENI GANAPATHY SILKS", "NEHRU SILAI", "PILLAIYAR KOVIL", "CONVENT", "ARAVIND HOSPITAL", "BOMMAYAGOUNDAN PATTY", "RATHINAM NAGAR", "LAKSHMIPURAM", "COLLEGE VILAKKU", "MOONDRANTHAL", "PERIYAKULAM RMTC DEPO", "PSNACET"],
"PSNA-61": ["MAHAL", "THAVITTU SANDHAI", "THERKUVASAL", "SAPPANI KOVIL", "CRIME BRANCH", "PERIYAR BUS STAND", "MA PALAYAM", "ESI", "DEVAGI SCAN", "PSNACET"],
"PSNA-69": ["MA.MU.KOVILUR PIRIVU", "POLICE QUARTERS", "SEELAPADI BYE.PASS", "OIL MILL", "NIVIS MAHAL", "CHETTINAICKEN PATTI PIRIVU", "ANJALI BYE.PASS", "PSNACET"],
"PSNA-73": ["SMBM SCHOOL", "MSP SCHOOL", "AMMA MESS", "12TH CROSS", "9TH CROSS", "7TH CROSS", "WATER TANK", "4TH CROSS", "MVM COLLEGE", "ANJALI BYE PASS", "PSNACET"],
"PSNA-72": ["DGL SCAN", "DGL BUS STAND", "DGL GH", "AARIYABHAVAN", "VANI VILAS SIGNAL", "PALANI BYE.PASS", "PSNACET"],
"PSNA-74": ["PATTIVEERAN PATTY", "ANNA NAGAR", "SAVADI", "RADIO POTTAL", "GANDHI PURAM", "THEVARAN PATTY PIRIVU", "VEPPAMARAM", "ARASAMARAM", "GANESHAPURAM", "AATHUR TALUK OFFICE", "AATHUR BUS STAND", "S PARAI PATTY", "DHARUMATHUPATTY", "KANNIVADI", "AALATHURAN PATTY", "PUDHUPATTY", "REDDIYAR CHATRAM", "PSNACET"],
"PSNA-30": ["MURUGABHAVANAM", "AYYANGULAM", "SAKTHI TALKIES", "AARIYABHAVAN", "VANI VILAS", "JEGANATH HOSPITAL", "SONA TOWER", "AMMA MESS", "12TH CROSS", "9TH CROSS", "8TH CROSS", "7TH CROSS", "WATER TANK", "4TH CROSS", "MVM COLLEGE", "ANJALI BYE PASS", "PSNACET"],
"PSNA-20": ["ATHIKARIPATTI", "SILUVATHUR", "PUGAIYELAIPATTI PIRIVU", "PANNAI PATTY PIRIVU", "RAJAKKA PATTY", "M.M.KOVILUR PIRIVU (2)", "SOUNDRARAJA AIRPORT", "UTHANAMPATTY PRIVU", "BALAKRISHNAPURAM", "SMBM SCHOOL", "PSNACET"],
"PSNA-23": ["NATHAM KOVILPATTI", "NATHAM BUS STAND", "ANNA NAGAR", "UZUPAKUDI", "OTHAKADAI", "KANAVAPATTY", "GOPAL PATTY", "KANNIYAPURAM", "METTUKADAI", "SANARPATTY", "KOSAVAPATTY", "VALAKKAPATTI", "PONNAGARAM", "ITI", "PSNACET"],
"PSNA-28": ["VADIPATTI", "VADIPATTI CHURCH", "PANDIYARAJAPURAM PRIVU", "PALLAPATTI PRIVU", "AMMAYANAYAKKANUR", "KODAIROAD", "TOLL GATE", "KOZHINJIPATTI PIRIVU", "KAMALAPURAM", "AMBATHURAI", "AANGANEYAR KOVIL", "PSNACET"],
"PSNA-29": ["BALAKRISHNAPURAM", "SMBM SCHOOL", "SP OFFICE", "DGL SCAN", "DGL BUS STAND", "DGL G.H", "AARIYABHAVAN", "PALANI BYE.PASS", "PSNACET"],
"PSNA-31": ["KULLANAMPATTY", "II RMTC", "VIJAY THEATRE", "NAGAL NAGAR", "ANNAMALAYAR SCHOOL", "BHARATH!PURAM", "BHUVANESWARI AMMAN KOVIL", "METTUPATTY", "BEGAMBUR", "PARAPATTI K", "A.P NAGAR", "PSNACET"],
"PSNA-36": ["CHINNALAPATTY", "POONCHOLAI", "CHINNALAPATTY PIRIVU", "KEELAKOTTAI BYE-PASS", "CHETTIYAPATTY PIRIVU", "KALIKAM PATTY PIRIVU", "POKUVARATHU NAGAR", "VELLODU PIRIVU", "PANJAM PATTY PIRIVU (EAST)", "COFFEE SHOP", "ANNAMALAYAR MILL", "THOMAYARPURAM", "PSNACET"],
"PSNA-35": ["SMBM SCHOOL", "SP OFFICE", "SP OFFICE", "DGL BUS STAND", "AARIYABHAVAN", "VANI VILAS SIGNAL", "PALANI BYE-PASS", "PSNACET"],
"PSNA-32": ["MA.MU.KOVILUR PIRIVU", "SEELAPADI BYE.PASS", "NGA MILL", "NGO COLONY", "UZAVAR SANTHAI", "CITY HOSPITAL", "PSNACET"],
"PSNA-56": ["KULLANAMPATTY", "II RMTC", "VIJAY THEATRE", "NAGAL NAGAR", "ANNAMALAYAR SCHOOL", "BHARATH!PURAM", "BHUVANESWARI AMMAN KOVIL", "METTUPATTY", "BEGAMBUR", "PARAPATTI K", "A.P NAGAR", "PSNACET"],
"PSNA-22": ["NATHAM KOVILPATTI", "NATHAM BUS STAND", "ANNA NAGAR", "UZUPAKUDI", "OTHAKADAI", "KANAVAPATTY", "GOPAL PATTY", "KANNIYAPURAM", "METTUKADAI", "SANARPATTY", "KOSAVAPATTY", "VALAKKAPATTI", "PONNAGARAM", "ITI", "PSNACET"],
"PSNA-39": ["PALANI NEIKARAPATTY", "ALAGAPURI", "VANDI VAYKKAL", "KARAMADAI", "BALAJI MILL", "SAMY THEATRE", "RANAKALI AMMAN KOVIL", "PALANI BUS STAND", "T.B", "APA COLLEGE", "THIRU NAGAR", "HOUSING BOARD", "ITO SCHOOL", "OLD AYAKUDI", "NEW AYAKUDI", "KANAKKANPATTY", "CHATRAPATTY", "VIRUPPATCHI", "RELIANCE PETROL PUNK / RTO OFFICE", "PSNACET"]

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

function withRouteOwnershipMetadata(busData: any, busId: string, options?: { driverId?: string; sharedByUserId?: string | null }) {
  return {
    ...busData,
    routeId: busData?.routeId || busId,
    driverId: options?.driverId || busData?.driverId || busId,
    sharedByUserId: options?.sharedByUserId ?? busData?.sharedByUserId
  }
}

function buildRouteEnvelope(busData: any, busId: string) {
  const stops = Array.isArray(busData?.busStops) ? busData.busStops : []
  return {
    routeId: busData?.routeId || busId,
    driverId: busData?.driverId || busId,
    sharedByUserId: busData?.sharedByUserId || null,
    stops,
    passedStops: stops.filter((stop: any) => stop?.passed).map((stop: any) => stop.id)
  }
}

function hasShareExpired(expiresAt?: string | null) {
  if (!expiresAt) return false
  const expiryTime = new Date(expiresAt).getTime()
  if (Number.isNaN(expiryTime)) return false
  return expiryTime <= Date.now()
}

// Routes
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// User registration
app.post('/register', async (c) => {
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
app.post('/send-reset-code', async (c) => {
  try {
    const { email } = await c.req.json()
    
    if (!email) {
      return c.json({ error: 'Email is required' }, 400)
    }

    // Check if user exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      console.log('Error checking user:', listError)
      return c.json({ error: 'Failed to verify email' }, 500)
    }

    const userExists = users.find(u => u.email === email)
    if (!userExists) {
      return c.json({ error: 'No account found with this email' }, 404)
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

    // Send email using Resend API
    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      
      if (resendApiKey) {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: 'BusTracker <onboarding@resend.dev>',
            to: email,
            subject: 'BusTracker Password Reset Code',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #8b5cf6;">BusTracker Password Reset</h2>
                <p>Hello,</p>
                <p>You requested to reset your password. Use the verification code below:</p>
                <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                  <h1 style="color: #1f2937; font-size: 32px; letter-spacing: 8px; margin: 0;">${code}</h1>
                </div>
                <p>This code will expire in <strong>5 minutes</strong>.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 12px;">BusTracker - Live Bus Location Tracking</p>
              </div>
            `
          })
        })

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json()
          console.log('Email sending failed:', errorData)
          throw new Error('Email API failed')
        }

        console.log(`Password reset code sent to ${email}`)
        return c.json({ success: true, message: 'Verification code sent to your email' })
      } else {
        // Fallback: Log to console if no API key configured
        console.log(`⚠️ RESEND_API_KEY not configured. Password reset code for ${email}: ${code}`)
        console.log(`Please configure RESEND_API_KEY environment variable for email functionality`)
        return c.json({ success: true, message: 'Verification code sent (check console logs)' })
      }
    } catch (emailError) {
      console.log('Email sending error:', emailError)
      // Even if email fails, return success since code is stored
      console.log(`Password reset code for ${email}: ${code}`)
      return c.json({ success: true, message: 'Verification code generated (check console logs)' })
    }
  } catch (error) {
    console.log('Send reset code error:', error)
    return c.json({ error: 'Failed to send reset code' }, 500)
  }
})

// Reset password with verification code
app.post('/reset-password', async (c) => {
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

// Shared handler to avoid path-mismatch 404s for profile in different runtimes.
const handleGetProfile = async (c: any) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    let userData = await kv.get(`user:${user.id}`)
    if (!userData) {
      const roleFromAuth = user.user_metadata?.role === 'driver' ? 'driver' : 'passenger'
      const fallbackProfile = {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        role: roleFromAuth,
        coins: roleFromAuth === 'passenger' ? 50 : 0,
        createdAt: new Date().toISOString()
      }

      await kv.set(`user:${user.id}`, fallbackProfile)
      if (roleFromAuth === 'driver') {
        const existingDriverData = await kv.get(`driver:${user.id}`)
        if (!existingDriverData) {
          await kv.set(`driver:${user.id}`, {
            isOnline: false,
            route: '',
            currentLocation: null,
            lastUpdated: new Date().toISOString()
          })
        }
      }

      userData = fallbackProfile
    }

    const passengerLink = await kv.get(`passenger:${user.id}`)
    return c.json({
      user: {
        ...userData,
        linkedDriverId: passengerLink?.linkedDriverId || null
      }
    })
  } catch (error) {
    console.log('Profile fetch error:', error)
    return c.json({ error: 'Failed to fetch user profile' }, 500)
  }
}

// Get user profile
app.get('/profile', handleGetProfile)
app.get('/profile/', handleGetProfile)
app.get('/make-server-8b08beda/profile', handleGetProfile)

// Update user coins
app.post('/update-coins', async (c) => {
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
    if (true)//(operation === 'add') 
    {
      newCoins += amount
    } else if (operation === 'subtract') {
      newCoins = Math.max(0, newCoins - amount)
    }

    const updatedUser = { ...userData, coins: newCoins }
    await kv.set(`user:${user.id}`, updatedUser)

    return c.json({ coins: newCoins })
  } catch (error){
    console.log('Coin update error:', error)
    return c.json({ error: 'Failed to update coins' }, 500)
  }
})

// Driver goes online/offline
app.post('/driver/status', async (c) => {
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

    // Track trip history and award coins for location sharing
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
        coins: (userData.coins || 0) + 10, // Award 10 coins for sharing location
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

    // Store in bus locations for map visibility
    if (isOnline && location && busName) {
      const freshUserData = await kv.get(`user:${user.id}`)
      const existingBusData = await kv.get(`bus:${user.id}`)
      let busStops =
        existingBusData?.route === busName
          ? (existingBusData?.busStops || [])
          : []

      if (!Array.isArray(busStops) || busStops.length === 0) {
        busStops = await getDefaultRoutesForBus(busName)
      }

      const busRecord = withRouteOwnershipMetadata({
        id: user.id,
        driverName: freshUserData?.name || 'Unknown Driver',
        route: busName,
        lat: location.lat,
        lng: location.lng,
        isOnline: true,
        lastUpdated: new Date().toISOString(),
        expiresAt: null,
        busStops: busStops,
        tripStartTime: existingBusData?.tripStartTime || new Date().toISOString(),
        previousLocations: existingBusData?.previousLocations || []
      }, user.id, { driverId: user.id, sharedByUserId: null })

      await kv.set(`bus:${user.id}`, busRecord)
    } else {
      // Mark bus as offline but keep last known location for 3 hours
      const existingBus = await kv.get(`bus:${user.id}`)
      if (existingBus) {
        const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
        await kv.set(
          `bus:${user.id}`,
          withRouteOwnershipMetadata(
            { ...existingBus, isOnline: false, expiresAt, lastUpdated: new Date().toISOString() },
            user.id,
            { driverId: existingBus?.driverId || user.id }
          )
        )
      }
    }

    return c.json({ success: true, status: driverData })
  } catch (error) {
    console.log('Driver status update error:', error)
    return c.json({ error: 'Failed to update driver status' }, 500)
  }
})

// Generate OTP
app.post('/driver/generate-otp', async (c) => {
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
const handleGetDriverOtps = async (c: any) => {
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
}

app.get('/driver/otps', handleGetDriverOtps)
app.get('/make-server-8b08beda/driver/otps', handleGetDriverOtps)

// Validate OTP and start location sharing (passenger acts as driver)
app.post('/passenger/share-location', async (c) => {
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

    // Award 10 coins to the user for sharing location
    const currentCoins = userData.coins || 0
    await kv.set(`user:${user.id}`, { ...userData, coins: currentCoins + 10 })

    // Create bus entry (passenger acting as driver) while preserving route ownership
    const busStops = await getDefaultRoutesForBus(busName)
    const passengerBusRecord = withRouteOwnershipMetadata({
      id: user.id,
      driverName: userData.name,
      route: busName,
      lat: location.lat,
      lng: location.lng,
      isOnline: true,
      lastUpdated: new Date().toISOString(),
      expiresAt: null,
      busStops: busStops,
      isPassengerDriver: true, // Mark as passenger acting as driver
      otpId: validOTP.id,
      tripStartTime: new Date().toISOString(),
      previousLocations: []
    }, user.id, { driverId: validOTP.driverId, sharedByUserId: user.id })

    await kv.set(`bus:${user.id}`, passengerBusRecord)

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
      // Enforce a 3-hour share TTL independent of OTP lifetime
      expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      driverId: validOTP.driverId,
      otpCode: otpCode
    }

    await kv.set(shareId, shareData)
    await kv.set(`passenger:${user.id}`, {
      linkedDriverId: validOTP.driverId,
      activeShareId: shareId,
      otpId: validOTP.id,
      linkedAt: new Date().toISOString()
    })
    
    return c.json({ 
      success: true, 
      share: shareData,
      message: 'Location sharing started! Valid for 3 hours. +10 coins earned!',
      coinsEarned: 10,
      newBalance: currentCoins + 10
    })
  } catch (error) {
    console.log('Location sharing error:', error)
    return c.json({ error: 'Failed to start location sharing' }, 500)
  }
})

// Stop location sharing (passenger or driver can stop)
const handlePassengerStopSharing = async (c: any) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const { shareId } = await c.req.json()

    // If shareId provided, stop that specific share (driver/owner stopping passenger)
    if (shareId) {
      const share = await kv.get(shareId)
      if (!share) {
        return c.json({ error: 'Share not found' }, 404)
      }

      const isPassengerOwner = share.userId === user.id
      const isLinkedDriver = share.driverId === user.id
      if (!isPassengerOwner && !isLinkedDriver) {
        return c.json({ error: 'Unauthorized to stop this share' }, 403)
      }

      await kv.set(shareId, { ...share, active: false, stoppedAt: new Date().toISOString() })
      await kv.del(`bus:${share.userId}`)
      await kv.del(`passenger:${share.userId}`)
      return c.json({ success: true })
    }

    // Stop own sharing (passenger stopping themselves)
    const shares = await kv.getByPrefix(`share:${user.id}:`)
    const activeShare = shares.find(share => share.active)

    if (!activeShare) {
      return c.json({ error: 'No active location sharing found' }, 404)
    }

    await kv.set(activeShare.id, { ...activeShare, active: false, stoppedAt: new Date().toISOString() })
    await kv.del(`bus:${user.id}`)
    await kv.del(`passenger:${user.id}`)

    return c.json({ success: true })
  } catch (error) {
    console.log('Stop sharing error:', error)
    return c.json({ error: 'Failed to stop location sharing' }, 500)
  }
}

app.post('/passenger/stop-sharing', handlePassengerStopSharing)
app.post('/make-server-8b08beda/passenger/stop-sharing', handlePassengerStopSharing)

// Pause location sharing (when device location turned off) - keep last-known for 3 hours
app.post('/passenger/pause-sharing', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const shares = await kv.getByPrefix(`share:${user.id}:`)
    const activeShare = shares.find(share => share.active)
    if (!activeShare) {
      return c.json({ error: 'No active location sharing found' }, 404)
    }

    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()

    // Mark share as paused and update expiresAt
    await kv.set(activeShare.id, { ...activeShare, paused: true, lastUpdated: new Date().toISOString(), expiresAt })

    // Update bus entry to be offline but retain last-known and expiresAt
    const busData = await kv.get(`bus:${user.id}`)
    if (busData) {
      await kv.set(
        `bus:${user.id}`,
        withRouteOwnershipMetadata(
          { ...busData, isOnline: false, expiresAt, lastUpdated: new Date().toISOString() },
          user.id,
          { driverId: busData?.driverId || user.id, sharedByUserId: busData?.sharedByUserId }
        )
      )
    }

    return c.json({ success: true, paused: true, expiresAt })
  } catch (error) {
    console.log('Pause sharing error:', error)
    return c.json({ error: 'Failed to pause location sharing' }, 500)
  }
})

// Stop OTP (Driver can revoke an OTP)
app.post('/driver/stop-otp', async (c) => {
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
        await kv.set(share.id, { ...share, active: false, stoppedAt: new Date().toISOString(), stoppedBy: user.id })
        await kv.del(`bus:${share.userId}`)
        await kv.del(`passenger:${share.userId}`)
      }
      
      return c.json({ success: true })
    }
    
    return c.json({ error: 'OTP not found or unauthorized' }, 404)
  } catch (error) {
    console.log('Stop OTP error:', error)
    return c.json({ error: 'Failed to stop OTP' }, 500)
  }
})

const handleGetBuses = async (c: any) => {
  try {
    const buses = await kv.getByPrefix('bus:')
    // Return online buses and last-known offline buses that haven't expired
    const now = new Date().getTime()
    const visibleBuses = buses.filter(bus => {
      if (bus.isOnline) return true
      if (bus.expiresAt) {
        return new Date(bus.expiresAt).getTime() > now
      }
      return false
    }).map((bus) => withRouteOwnershipMetadata(bus, bus.id, { driverId: bus?.driverId || bus.id }))

    return c.json({ buses: visibleBuses })
  } catch (error) {
    console.log('Buses fetch error:', error)
    return c.json({ error: 'Failed to fetch bus locations' }, 500)
  }
}

// Get all active buses for passengers
app.get('/buses', handleGetBuses)
app.get('/make-server-8b08beda/buses', handleGetBuses)

// Get all visible location shares for universal map visibility
const handleGetLocationShares = async (c: any) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const allShares = await kv.getByPrefix('share:')
    const visibleShares: any[] = []

    for (const share of allShares) {
      if (!share.active) continue

      if (hasShareExpired(share.expiresAt)) {
        await kv.set(share.id, { ...share, active: false, stoppedAt: new Date().toISOString(), stoppedBy: 'system-expiry' })
        await kv.del(`bus:${share.userId}`)
        await kv.del(`passenger:${share.userId}`)
        continue
      }

      visibleShares.push(share)
    }

    return c.json({ shares: visibleShares })
  } catch (error) {
    console.log('Location shares fetch error:', error)
    return c.json({ error: 'Failed to fetch location shares' }, 500)
  }
}

app.get('/location-shares', handleGetLocationShares)
app.get('/make-server-8b08beda/location-shares', handleGetLocationShares)

// Get active location shares for a driver
const handleGetDriverLocationShares = async (c: any) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const allShares = await kv.getByPrefix('share:')
    const driverShares: any[] = []

    for (const share of allShares) {
      if (!share.active || share.driverId !== user.id) continue

      if (hasShareExpired(share.expiresAt)) {
        await kv.set(share.id, { ...share, active: false, stoppedAt: new Date().toISOString(), stoppedBy: 'system-expiry' })
        await kv.del(`bus:${share.userId}`)
        await kv.del(`passenger:${share.userId}`)
        continue
      }

      driverShares.push(share)
    }

    return c.json({ shares: driverShares })
  } catch (error) {
    console.log('Location shares fetch error:', error)
    return c.json({ error: 'Failed to fetch location shares' }, 500)
  }
}

app.get('/driver/location-shares', handleGetDriverLocationShares)
app.get('/make-server-8b08beda/driver/location-shares', handleGetDriverLocationShares)

// Update passenger location (for active sharing - passenger acting as driver)
app.post('/passenger/update-location', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const { location } = await c.req.json()
    
    const shares = await kv.getByPrefix(`share:${user.id}:`)
    const activeShare = shares.find(share => share.active)

    if (activeShare) {
      const fallbackExpiry = new Date(new Date(activeShare.startTime).getTime() + 3 * 60 * 60 * 1000).toISOString()
      const effectiveExpiry = activeShare.expiresAt || fallbackExpiry

      if (hasShareExpired(effectiveExpiry)) {
        await kv.set(activeShare.id, {
          ...activeShare,
          active: false,
          stoppedAt: new Date().toISOString(),
          stoppedBy: 'system-expiry'
        })
        await kv.del(`bus:${user.id}`)
        await kv.del(`passenger:${user.id}`)
        return c.json({ success: false, error: 'Location sharing expired after 3 hours', expired: true })
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
        
        await kv.set(
          `bus:${user.id}`,
          withRouteOwnershipMetadata(
            {
              ...busData,
              lat: location.lat,
              lng: location.lng,
              lastUpdated: new Date().toISOString(),
              previousLocations
            },
            user.id,
            { driverId: busData?.driverId || activeShare.driverId, sharedByUserId: busData?.sharedByUserId || user.id }
          )
        )
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
app.get('/bus/:busId/stops', async (c) => {
  try {
    const busId = c.req.param('busId')
    const rawBusData = await kv.get(`bus:${busId}`)
    
    if (!rawBusData) {
      return c.json({ error: 'Bus not found' }, 404)
    }

    const busData = withRouteOwnershipMetadata(rawBusData, busId, {
      driverId: rawBusData?.driverId || busId,
      sharedByUserId: rawBusData?.sharedByUserId
    })

    // If bus has no stops, try to get default routes
    let busStops = busData.busStops || []
    if (busStops.length === 0) {
      busStops = await getDefaultRoutesForBus(busData.route)
    }

    return c.json({
      route: {
        ...buildRouteEnvelope({ ...busData, busStops }, busId)
      },
      busStops
    })
  } catch (error) {
    console.log('Bus stops fetch error:', error)
    return c.json({ error: 'Failed to fetch bus stops' }, 500)
  }
})

// Update bus stop status (driver marks stop as passed)
app.post('/driver/update-stop', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const { busId, stopId, passed } = await c.req.json()
    if (!busId || !stopId || typeof passed !== 'boolean') {
      return c.json({ error: 'busId, stopId, and passed are required' }, 400)
    }

    const rawBusData = await kv.get(`bus:${busId}`)
    if (!rawBusData) {
      return c.json({ error: 'Bus not found' }, 404)
    }

    const busData = withRouteOwnershipMetadata(rawBusData, busId, {
      driverId: rawBusData?.driverId || busId,
      sharedByUserId: rawBusData?.sharedByUserId
    })

    const isRouteOwner = user.id === busData.driverId
    let isLinkedPassenger = false

    if (!isRouteOwner) {
      const passengerLink = await kv.get(`passenger:${user.id}`)
      isLinkedPassenger =
        !!passengerLink &&
        passengerLink.linkedDriverId === busData.driverId &&
        busData.sharedByUserId === user.id
    }

    if (!isRouteOwner && !isLinkedPassenger) {
      return c.json({ error: 'Unauthorized to mark stop on this route' }, 403)
    }

    const updatedBusStops = (busData.busStops || []).map(stop => 
      stop.id === stopId ? { ...stop, passed } : stop
    )

    const updatedBusData = withRouteOwnershipMetadata({
      ...rawBusData,
      busStops: updatedBusStops,
      lastUpdated: new Date().toISOString()
    }, busId, {
      driverId: busData.driverId,
      sharedByUserId: busData.sharedByUserId
    })

    await kv.set(`bus:${busId}`, updatedBusData)

    return c.json({ success: true, busStops: updatedBusStops })
  } catch (error) {
    console.log('Bus stop update error:', error)
    return c.json({ error: 'Failed to update bus stop' }, 500)
  }
})

// Update multiple bus stops (driver edits route names)
app.post('/driver/update-stops', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const { busId, busStops } = await c.req.json()
    if (!busId || !Array.isArray(busStops)) {
      return c.json({ error: 'busId and busStops are required' }, 400)
    }

    const rawBusData = await kv.get(`bus:${busId}`)
    if (!rawBusData) {
      return c.json({ error: 'Bus not found' }, 404)
    }

    const busData = withRouteOwnershipMetadata(rawBusData, busId, {
      driverId: rawBusData?.driverId || busId,
      sharedByUserId: rawBusData?.sharedByUserId
    })

    if (user.id !== busData.driverId) {
      return c.json({ error: 'Unauthorized to update this route' }, 403)
    }

    const updatedBusData = withRouteOwnershipMetadata({
      ...rawBusData,
      busStops,
      lastUpdated: new Date().toISOString()
    }, busId, {
      driverId: busData.driverId,
      sharedByUserId: busData.sharedByUserId
    })

    await kv.set(`bus:${busId}`, updatedBusData)

    return c.json({ success: true, busStops })
  } catch (error) {
    console.log('Bus stops update error:', error)
    return c.json({ error: 'Failed to update bus stops' }, 500)
  }
})

// Add a new route stop (driver adds route)
app.post('/driver/add-route', async (c) => {
  const { error: authError, user } = await authenticateRequest(c.req.raw)
  if (authError || !user) {
    return c.json({ error: authError || 'Authentication failed' }, 401)
  }

  try {
    const { busId, routeName } = await c.req.json()
    if (!busId) {
      return c.json({ error: 'busId is required' }, 400)
    }

    if (!routeName || !routeName.trim()) {
      return c.json({ error: 'Route name is required' }, 400)
    }

    const rawBusData = await kv.get(`bus:${busId}`)
    if (!rawBusData) {
      return c.json({ error: 'Bus not found' }, 404)
    }

    const busData = withRouteOwnershipMetadata(rawBusData, busId, {
      driverId: rawBusData?.driverId || busId,
      sharedByUserId: rawBusData?.sharedByUserId
    })

    if (user.id !== busData.driverId) {
      return c.json({ error: 'Unauthorized to update this route' }, 403)
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

    const updatedBusData = withRouteOwnershipMetadata({
      ...rawBusData,
      busStops: updatedBusStops,
      lastUpdated: new Date().toISOString()
    }, busId, {
      driverId: busData.driverId,
      sharedByUserId: busData.sharedByUserId
    })

    await kv.set(`bus:${busId}`, updatedBusData)

    return c.json({ success: true, busStops: updatedBusStops })
  } catch (error) {
    console.log('Add route error:', error)
    return c.json({ error: 'Failed to add route' }, 500)
  }
})

const handleGetAvailableBuses = async (c: any) => {
  try {
    const buses = await initializeDefaultBuses()
    return c.json({ buses })
  } catch (error) {
    console.log('Fetching available buses error:', error)
    return c.json({ error: 'Failed to fetch available buses' }, 500)
  }
}

// Get available bus list (public endpoint - no auth required)
app.get('/buses/available', handleGetAvailableBuses)
app.get('/make-server-8b08beda/buses/available', handleGetAvailableBuses)

// Add new bus to the list (drivers only)
app.post('/buses/add', async (c) => {
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

// AI Chatbot endpoint
app.post('/chatbot', async (c) => {
  try {
    const { message } = await c.req.json()
    
    if (!message) {
      return c.json({ error: 'Message is required' }, 400)
    }

    const lowerMessage = message.toLowerCase()
    
    // Get all buses data
    const allBuses = await kv.getByPrefix('bus:')
    const availableBuses = await initializeDefaultBuses()
    const onlineBuses = allBuses.filter(bus => bus.isOnline)
    const offlineBuses = availableBuses.length - onlineBuses.length

    let response = ''

    // Check for specific bus route query
    const busMatch = lowerMessage.match(/psna[-\s]?(\d+|[\d\/]+)/i)
    if (busMatch) {
      const busNumber = busMatch[1]
      const busName = `PSNA-${busNumber}`
      
      const busRoute = DEFAULT_BUS_ROUTES[busName]
      if (busRoute) {
        response = `📍 **Routes for ${busName}**\n\n${busRoute.map((stop, i) => `${i + 1}. ${stop}`).join('\n')}\n\n✅ Total stops: ${busRoute.length}`
      } else {
        response = `❌ Sorry, I don't have route information for ${busName}. This bus may not be in our system.`
      }
    }
    // How many buses online/offline
    else if (lowerMessage.includes('online') || lowerMessage.includes('offline')) {
      response = `🚌 **Bus Status**\n\n✅ Online: ${onlineBuses.length} buses\n⏸️ Offline: ${offlineBuses} buses\n📊 Total buses in app: ${availableBuses.length}\n\n${onlineBuses.length > 0 ? `Currently online buses:\n${onlineBuses.map(bus => `• ${bus.route}`).join('\n')}` : 'No buses are currently online.'}`
    }
    // How many buses in app
    else if (lowerMessage.includes('how many') && lowerMessage.includes('bus')) {
      response = `📊 **Total Buses in App**: ${availableBuses.length}\n\n✅ Currently online: ${onlineBuses.length}\n⏸️ Currently offline: ${offlineBuses}\n\nAvailable buses:\n${availableBuses.slice(0, 10).join(', ')}${availableBuses.length > 10 ? ` ...and ${availableBuses.length - 10} more` : ''}`
    }
    // List all buses
    else if (lowerMessage.includes('list') && lowerMessage.includes('bus')) {
      response = `🚌 **All Available Buses**:\n\n${availableBuses.join(', ')}\n\n📊 Total: ${availableBuses.length} buses`
    }
    else if (lowerMessage.includes('owner') && lowerMessage.includes('app')) {
      response = `🚌 **GOKUL K**:\n His mail id is gokulk24cb@psnacet.edu.in`
    }
    else if (lowerMessage.includes('psna') && lowerMessage.includes('details')) {
      response = `🚌 **PSNACET BUSES**:\n visit psnacet offcial website.`
    }
    // Help/default response
    else {
      response = `👋 **Hi! I'm your BusTracker AI Assistant**\n\nI can help you with:\n\n🔹 **Bus Routes**: Ask "Tell me the routes of bus PSNA-30"\n🔹 **Bus Status**: Ask "How many buses are online?"\n🔹 **Bus Count**: Ask "How many buses in app?"\n🔹 **List Buses**: Ask "List all buses"\n\nWhat would you like to know?`
    }

    return c.json({ 
      success: true, 
      response,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.log('Chatbot error:', error)
    return c.json({ error: 'Failed to process chatbot request' }, 500)
  }
})

// Start the server.
// Some gateway/proxy paths may include the function slug again
// (e.g. /make-server-8b08beda/driver/location-shares).
// Normalize that prefix so all routes resolve consistently.
const FUNCTION_PATH_PREFIX = '/make-server-8b08beda'

Deno.serve((request: Request) => {
  const url = new URL(request.url)
  if (url.pathname === FUNCTION_PATH_PREFIX || url.pathname.startsWith(`${FUNCTION_PATH_PREFIX}/`)) {
    url.pathname = url.pathname.slice(FUNCTION_PATH_PREFIX.length) || '/'
    request = new Request(url.toString(), request)
  }
  return app.fetch(request)
})
