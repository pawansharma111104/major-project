# Battlefield Tracker Design Guidelines

## Design Approach

**Selected Approach**: Design System (Material Design + Tactical UI Conventions)

**Justification**: This is a mission-critical, information-dense application requiring maximum clarity, efficiency, and reliability. Drawing from Material Design's structured approach combined with tactical/military interface conventions ensures optimal usability in field conditions.

**Key Principles**:
- Information hierarchy optimized for rapid scanning
- High contrast for visibility in varied lighting conditions
- Large touch targets for field operation (minimum 48px)
- Persistent status indicators for situational awareness
- Minimal cognitive load through clear visual language

---

## Typography

**Font Family**: 
- Primary: "Roboto Mono" (monospaced for coordinates/data)
- Secondary: "Inter" or "Roboto" (UI text)
- Load via Google Fonts CDN

**Type Scale**:
- H1 (Page Headers): 32px, bold (font-bold)
- H2 (Section Headers): 24px, semibold (font-semibold)
- H3 (Card Headers): 18px, medium (font-medium)
- Body: 16px, normal (font-normal)
- Small/Meta: 14px, normal
- Data/Coordinates: 16px, monospace, medium
- Status Text: 14px, uppercase, tracking-wide

---

## Layout System

**Spacing Primitives**: Tailwind units of **2, 4, 8, 12, 16** (e.g., p-2, m-4, gap-8, p-12, py-16)

**Grid System**:
- Mobile-first approach (100% width base)
- Container: max-w-7xl mx-auto px-4
- Component spacing: py-8 between major sections
- Card/Module spacing: gap-4 for related elements

**Responsive Breakpoints**:
- Mobile: base (< 640px) - single column
- Tablet: md (≥ 768px) - 2 columns where appropriate
- Desktop: lg (≥ 1024px) - full layouts with sidebars

---

## Component Library

### Soldier App Interface

**Login Screen**:
- Centered card (max-w-md) on full-height screen
- App logo/insignia at top (h-16)
- Form inputs with large touch targets (h-12)
- Codename and password fields with clear labels
- Primary CTA button spanning full width (h-12)
- Spacing: p-8 card padding, gap-4 between fields

**GPS Dashboard** (Post-Login):
- Fixed header (h-16) with codename, logout, connection status indicator
- Large status card showing GPS coordinates (monospace font, text-lg)
- GPS toggle switch - prominent (h-20) with clear ON/OFF states
- Quick Action Grid: 2x2 button grid (gap-4), each button h-24, rounded-lg
  - Predefined messages: "Engaged with Enemy", "Need Medical Assistance", "Requesting Backup", "All Clear"
- Activity feed at bottom showing sent messages with timestamps
- Bottom padding (pb-20) for thumb-friendly scrolling

### Tracker App Interface

**View Switcher Header**:
- Sticky top header (h-14)
- Segmented control: "Radar View" | "Map View" | "List View"
- Filter/search icon on right
- Connection status indicator

**Radar View** (< 500m):
- SVG-based circular radar (w-full aspect-square)
- Concentric circles at 100m, 200m, 300m, 400m, 500m
- Center point: tracker position (fixed)
- Soldier markers: positioned by distance/angle, labeled with codename
- Distance scale on edge
- Legend card (fixed bottom): marker colors explained

**Map View** (≥ 500m):
- Full-height interactive map container
- Custom marker pins for each soldier
- Info cards on marker tap (shadow-lg, rounded-lg, p-4)
- Zoom controls (bottom-right)
- Current location FAB (bottom-left)

**List View**:
- Scrollable soldier cards (gap-4)
- Each card (p-4, rounded-lg):
  - Codename (text-lg, font-semibold)
  - Distance from tracker (text-sm, monospace)
  - Last update timestamp (text-xs)
  - Status indicator dot (h-3 w-3)
  - Quick verification button (h-8, text-sm)
- Pull-to-refresh indicator

**Alert System**:
- Toast notifications (top-right on desktop, top-center on mobile)
- Alert card (p-4, rounded-lg, shadow-xl):
  - Alert icon (h-6 w-6)
  - Soldier codename (font-semibold)
  - Message type (uppercase, text-sm)
  - Timestamp
  - Dismiss button
- Stacked with gap-2 for multiple alerts

**Drone Verification Panel** (Modal):
- Overlay (backdrop-blur)
- Modal card (max-w-lg, p-6, rounded-xl)
- Target soldier info at top
- Simulated camera feed placeholder (aspect-video, rounded)
- Verification status indicator (h-12, text-center)
- "Initiate Verification" button (h-10, w-full)
- Close button (top-right, h-8 w-8)

---

## Icons

**Library**: Heroicons (via CDN)
- GPS: location-marker (solid)
- Messages: chat-alt-2
- Verification: shield-check
- Alert: exclamation-circle
- Connection: signal
- Menu: menu
- Close: x

---

## Animations

**Minimal Use Only**:
- GPS pulse indicator: subtle scale animation on active GPS
- Alert slide-in: toast notifications from top (200ms)
- Connection status: fade transition (150ms)
- **No** scroll animations, parallax, or decorative effects

---

## Images

**No hero images** - this is a functional tactical application.

**Icons/Graphics**:
- App logo/military insignia (128x128) on login screen
- Status icons integrated via Heroicons
- Map tiles via Google Maps SDK
- Placeholder drone camera feed (16:9 aspect ratio)

---

## Accessibility

- ARIA labels for all interactive elements
- Clear focus states (ring-2) on all buttons/inputs
- Sufficient contrast ratios for all text
- Touch targets minimum 48x48px
- Screen reader friendly status announcements for real-time updates
- Consistent keyboard navigation patterns