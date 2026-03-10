# Navigation UI Mockup

## Current Layout (Before)

```
┌─────────────────────────────────────────────────────┐
│  🚌 BusTracker    [💰 50] [Admin] [Driver] [🔔]    │ ← Header
├─────────────────────────────────────────────────────┤
│                                                     │
│                                                     │
│                  Main Content                       │
│                                                     │
│                                                     │
│                                                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [🏠]    [🗺️]    [🔔]    [🛡️]    [⚙️]            │ ← Bottom Nav
│  Home    Map    Alerts   Admin  Profile            │
└─────────────────────────────────────────────────────┘
```

## New Layout (After)

```
┌─────────────────────────────────────────────────────┐
│ [☰] 🚌 BusTracker    [🔔 3] [💰 50] [Driver]       │ ← Header
├─────────────────────────────────────────────────────┤
│                                                     │
│                                                     │
│                  Main Content                       │
│                  (Full Height)                      │
│                                                     │
│                                                     │
│                                                     │
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Hamburger Menu (Opened)

```
┌─────────────────────────────────────────────────────┐
│ [☰] 🚌 BusTracker    [🔔 3] [💰 50] [Driver]       │
├─────────────────────────────────────────────────────┤
│ ┌──────────────┐                                    │
│ │              │                                    │
│ │  Navigation  │         Main Content               │
│ │              │         (Dimmed)                   │
│ │  🏠 Home     │                                    │
│ │              │                                    │
│ │  🗺️ Map      │                                    │
│ │              │                                    │
│ │  🔔 Alerts 3 │                                    │
│ │              │                                    │
│ │  👤 Profile  │                                    │
│ │              │                                    │
│ │  🛡️ Admin    │                                    │
│ │              │                                    │
│ └──────────────┘                                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Header Component Breakdown

### Before
```
┌────────────────────────────────────────────────────────────┐
│  [Logo] BusTracker    [Coins] [Admin Badge] [Role] [Bell] │
└────────────────────────────────────────────────────────────┘
```

### After
```
┌────────────────────────────────────────────────────────────┐
│  [☰] [Logo] BusTracker    [Bell+Badge] [Coins] [Role]     │
└────────────────────────────────────────────────────────────┘
     ↑                         ↑
  Hamburger              Notification Count
   Button                   Badge (3)
```

## Notification Badge Details

### Bell Icon with Badge
```
     ┌─────┐
     │  3  │ ← Badge (red, white text)
     └──┬──┘
   ┌────┴────┐
   │    🔔   │ ← Bell Icon
   └─────────┘
```

### Badge States
1. **No notifications**: Bell icon only, no badge
2. **1-9 notifications**: Badge shows exact number
3. **10+ notifications**: Badge shows "9+"

## Menu Item States

### Normal State
```
┌──────────────────────┐
│  🏠  Home            │
└──────────────────────┘
```

### Active State (Current Page)
```
┌──────────────────────┐
│  🗺️  Map             │ ← Primary background color
└──────────────────────┘
```

### With Notification Badge
```
┌──────────────────────┐
│  🔔  Alerts      [3] │ ← Red badge on right
└──────────────────────┘
```

### Hover State
```
┌──────────────────────┐
│  👤  Profile         │ ← Subtle background change
└──────────────────────┘
```

## Responsive Behavior

### Mobile (< 640px)
```
┌─────────────────────────┐
│ [☰] 🚌  [🔔3] [💰] [D] │ ← Compact header
├─────────────────────────┤
│                         │
│    Full Width Content   │
│                         │
└─────────────────────────┘

Menu opens full width (280px)
```

### Tablet (640px - 1024px)
```
┌──────────────────────────────────┐
│ [☰] 🚌 BusTracker  [🔔3] [💰50] │
├──────────────────────────────────┤
│                                  │
│       Wider Content Area         │
│                                  │
└──────────────────────────────────┘

Menu opens 320px width
```

## Color Scheme

### Header
- Background: `bg-primary` (blue)
- Text: `text-primary-foreground` (white)

### Hamburger Menu
- Background: `bg-background` (white)
- Border: `border-border` (light gray)
- Shadow: `shadow-lg`

### Active Menu Item
- Background: `bg-primary` (blue)
- Text: `text-primary-foreground` (white)

### Notification Badge
- Background: `bg-destructive` (red)
- Text: `text-destructive-foreground` (white)
- Border Radius: `rounded-full`

## Animation Specifications

### Menu Open/Close
- **Duration**: 200ms
- **Easing**: ease-out
- **Transform**: translateX(-100%) → translateX(0)

### Backdrop Fade
- **Duration**: 200ms
- **Easing**: ease-in-out
- **Opacity**: 0 → 0.5

### Badge Appearance
- **Animation**: Scale in (0.8 → 1.0)
- **Duration**: 150ms
- **Easing**: ease-out

## Accessibility Features

### Hamburger Button
```html
<button
  aria-label="Open navigation menu"
  aria-expanded="false"
  aria-controls="navigation-menu"
>
  <Menu />
</button>
```

### Notification Badge
```html
<div className="relative">
  <Bell />
  <span 
    className="badge"
    aria-label="3 unread notifications"
  >
    3
  </span>
</div>
```

### Menu Items
```html
<a
  href="#"
  aria-current="page"  // for active item
  role="menuitem"
>
  <Home />
  <span>Home</span>
</a>
```

## Component Hierarchy

```
MainApp
├── Header
│   ├── HamburgerMenuButton
│   ├── Logo
│   ├── NotificationBell (with badge)
│   ├── CoinsBadge
│   └── RoleBadge
├── HamburgerMenu (Sheet)
│   ├── MenuItem (Home)
│   ├── MenuItem (Map)
│   ├── MenuItem (Alerts + badge)
│   ├── MenuItem (Profile)
│   └── MenuItem (Admin - conditional)
└── MainContent
    └── [Current Tab Content]
```

## Implementation Notes

### Z-Index Layering
1. **Backdrop**: z-40
2. **Menu Drawer**: z-50
3. **Header**: z-30 (stays on top)

### Touch Targets
- Minimum size: 44x44px (iOS guidelines)
- Menu items: 48px height
- Hamburger button: 40x40px

### Performance
- Use CSS transforms for animations (GPU accelerated)
- Lazy load menu content if needed
- Debounce notification count updates

## Edge Cases

1. **Very long notification count**: Show "99+" for counts >= 100
2. **No admin access**: Hide admin menu item completely
3. **Menu open + orientation change**: Close menu automatically
4. **Rapid navigation**: Debounce tab changes
5. **Notification count updates**: Smooth transition, no flicker
